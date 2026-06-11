import { getSkillReport } from '../../scripts/api.js';
import { getSessionUser, isTestEnvironment } from '../../scripts/auth.js';
import { getDirectReports, normalizeLdap } from '../../scripts/employee-mapping.js';

function readBlockConfig(block) {
  return [...block.children].reduce((config, row) => {
    const cells = [...row.children];
    if (cells.length < 2) return config;
    const key = cells[0].textContent.trim().toLowerCase();
    const value = cells[1].textContent.trim();
    if (key) config[key] = value;
    return config;
  }, {});
}

function createElement(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (typeof text === 'string') el.textContent = text;
  return el;
}

// Rarity tiers by share of the workforce holding a skill (most → least common).
// First tier whose `minShare` the skill meets wins.
const RARITY_TIERS = [
  { id: 'generic', label: 'Generic', minShare: 0.5 },
  { id: 'niche', label: 'Niche', minShare: 0.3 },
  { id: 'super-niche', label: 'Super niche', minShare: 0.2 },
  { id: 'ultra-niche', label: 'Ultra niche', minShare: 0.1 },
];

function getRarityTier(share) {
  // The last tier has minShare 0, so a match is always found.
  return RARITY_TIERS.find((tier) => share >= tier.minShare);
}

const TIER_INDEX = new Map(RARITY_TIERS.map((tier, index) => [tier.id, index]));

// An employee's skills ordered by rarity tier (Generic → Ultra niche), then
// alphabetically within a tier. Shared by the rendered table and the CSV export
// so both list skills in the same order.
function sortedTierSkills(emp, skillRarity) {
  return [...emp.skills].sort((a, b) => {
    const tierA = TIER_INDEX.get(skillRarity?.get(a.name)?.tier?.id) ?? RARITY_TIERS.length;
    const tierB = TIER_INDEX.get(skillRarity?.get(b.name)?.tier?.id) ?? RARITY_TIERS.length;
    return tierA - tierB || a.name.localeCompare(b.name);
  });
}

/**
 * Computes a rarity tier per skill from how many employees across the whole
 * report hold it. Common skills are "generic", rare ones "ultra niche".
 * Computed over the full workforce, not the filtered team, so the tier reflects
 * org-wide scarcity.
 * @param {Array} employees all employees from the skill report
 * @returns {Map<string, {tier: object, holders: number, total: number, share: number}>}
 */
function computeSkillRarity(employees) {
  const total = employees.length;
  const counts = new Map();
  employees.forEach((emp) => {
    new Set(emp.skills.map((skill) => skill.name)).forEach((name) => {
      counts.set(name, (counts.get(name) || 0) + 1);
    });
  });

  const rarity = new Map();
  counts.forEach((holders, name) => {
    const share = total ? holders / total : 0;
    rarity.set(name, {
      tier: getRarityTier(share), holders, total, share,
    });
  });
  return rarity;
}

function getLevelLabel(proficiencyLevels, level) {
  const match = proficiencyLevels.find((entry) => entry.level === level);
  return match ? match.label : '—';
}

// Single-letter proficiency abbreviation (Master → M, Professional → P, …).
// The boilerplate levels each start with a distinct letter, so the first
// character is unambiguous.
function getLevelInitial(proficiencyLevels, level) {
  const label = getLevelLabel(proficiencyLevels, level);
  return label && label !== '—' ? label.charAt(0).toUpperCase() : '';
}

// Produces a CSV that mirrors the two-row thead (group + sub-header) and the
// rowspan body of the on-screen tier table so the export is 1:1 with what is
// displayed: Employee name only on the first skill row, skill placed under its
// matching tier column, all other tier columns empty for that row.
function tierTableToCsv(employees, proficiencyLevels, skillRarity) {
  // Row 1: Employee | Generic | "" | Niche | "" | …  (mirrors colspan-2 banners)
  const groupRow = ['Employee'];
  // Row 2: ""       | Skill   | Months | Skill | Months | … (sub-column headers)
  const subRow = [''];
  RARITY_TIERS.forEach((tier) => {
    groupRow.push(tier.label, '');
    subRow.push('Skill', 'Months');
  });

  const dataRows = [];
  employees.forEach((emp) => {
    const skills = sortedTierSkills(emp, skillRarity);
    if (skills.length === 0) {
      dataRows.push([emp.name, ...RARITY_TIERS.flatMap(() => ['', ''])]);
      return;
    }
    skills.forEach((skill, index) => {
      // Mirror the on-screen rowspan: name only on the employee's first row.
      const row = [index === 0 ? emp.name : ''];
      const skillTierId = skillRarity?.get(skill.name)?.tier?.id;
      RARITY_TIERS.forEach((tier) => {
        if (tier.id === skillTierId) {
          const initial = getLevelInitial(proficiencyLevels, skill.proficiencyLevel);
          row.push(initial ? `${skill.name} (${initial})` : skill.name);
          row.push(skill.expInMonths != null ? `${skill.expInMonths} M` : '');
        } else {
          row.push('', '');
        }
      });
      dataRows.push(row);
    });
  });

  return [groupRow, subRow, ...dataRows]
    .map((row) => row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(','))
    .join('\n');
}

function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}

/**
 * Renders the per-employee "skills by rarity tier" table: one column group per
 * rarity tier (Generic → Ultra niche), each split into a Skill (with level
 * initial) and an Experience sub-column. Each of an employee's skills becomes a
 * row, with its name+level and months placed under the tier that matches its
 * org-wide rarity; the employee name spans all of their skill rows.
 * @param {Element} body the block body to append the table into
 * @param {Array} employees the (filtered) employees to display
 * @param {Array} proficiencyLevels level metadata from the API
 * @param {Map} skillRarity per-skill rarity info from computeSkillRarity()
 */
function renderTierTable(body, employees, proficiencyLevels, skillRarity) {
  body.append(createElement('h3', 'report-table__subheading', 'Skills by rarity tier'));

  const tableWrapper = createElement('div', 'report-table__table-wrapper');
  const table = createElement('table', 'report-table__table report-table__table--tiers');

  // ── Header: Employee (rowspan 2), then a colspan-2 banner per tier, then a
  //    Skill / Months sub-column row. ──
  const thead = document.createElement('thead');
  const groupRow = document.createElement('tr');
  const employeeTh = createElement('th', 'report-table__col-employee', 'Employee');
  employeeTh.rowSpan = 2;
  groupRow.append(employeeTh);
  const subRow = document.createElement('tr');
  RARITY_TIERS.forEach((tier) => {
    const th = createElement('th', `report-table__group report-table__group--${tier.id}`, tier.label);
    th.colSpan = 2;
    groupRow.append(th);
    subRow.append(
      createElement('th', `report-table__col-skill report-table__tier report-table__tier--${tier.id} report-table__tier--lead`, 'Skill'),
      createElement('th', `report-table__col-skill report-table__tier report-table__tier--${tier.id} report-table__tier--trail`, 'Months'),
    );
  });
  thead.append(groupRow, subRow);
  table.append(thead);

  // ── Body: one row per skill, name spanning the employee's rows. ──
  const tbody = document.createElement('tbody');
  employees.forEach((emp) => {
    const skills = sortedTierSkills(emp, skillRarity);

    if (skills.length === 0) {
      const tr = document.createElement('tr');
      tr.append(createElement('td', 'report-table__cell-employee', emp.name));
      RARITY_TIERS.forEach((tier) => tr.append(
        createElement('td', `report-table__tier report-table__tier--${tier.id} report-table__tier--lead`),
        createElement('td', `report-table__tier report-table__tier--${tier.id} report-table__tier--trail`),
      ));
      tbody.append(tr);
      return;
    }

    skills.forEach((skill, index) => {
      const tr = document.createElement('tr');
      if (index === 0) {
        const nameTd = createElement('td', 'report-table__cell-employee', emp.name);
        nameTd.rowSpan = skills.length;
        tr.append(nameTd);
      }
      const skillTierId = skillRarity?.get(skill.name)?.tier?.id;
      RARITY_TIERS.forEach((tier) => {
        const skillTd = createElement('td', `report-table__tier report-table__tier--${tier.id} report-table__tier--lead`);
        const monthsTd = createElement('td', `report-table__tier report-table__tier--${tier.id} report-table__tier--trail`);
        if (tier.id === skillTierId) {
          const name = createElement('span', 'report-table__skill-label', skill.name);
          const initial = getLevelInitial(proficiencyLevels, skill.proficiencyLevel);
          if (initial) {
            skillTd.append(name, createElement('span', `report-table__badge report-table__badge--l${skill.proficiencyLevel}`, initial));
          } else {
            skillTd.append(name);
          }
          monthsTd.textContent = skill.expInMonths != null ? `${skill.expInMonths} M` : '—';
        }
        tr.append(skillTd, monthsTd);
      });
      tbody.append(tr);
    });
  });
  table.append(tbody);

  tableWrapper.append(table);
  body.append(tableWrapper);
}

function renderTable(block, config, data, skillRarity) {
  const { employees, metadata: { proficiencyLevels } } = data;

  block.textContent = '';
  const wrapper = createElement('div', 'report-table__wrapper');

  const header = createElement('div', 'report-table__header');
  header.append(
    createElement('span', 'report-table__heading-accent'),
    createElement('h2', 'report-table__heading', config.heading || 'Manager Skill Report'),
    createElement('p', 'report-table__meta', 'Manager View'),
  );

  wrapper.append(header);

  const body = createElement('div', 'report-table__body');

  const toolbar = createElement('div', 'report-table__toolbar');
  const legend = createElement('div', 'report-table__legend');
  proficiencyLevels.forEach(({ level, label }) => {
    const item = createElement('span', 'report-table__legend-item');
    item.append(createElement('span', `report-table__badge report-table__badge--l${level}`, label));
    legend.append(item);
  });
  toolbar.append(legend);

  const exportBtn = createElement('button', 'report-table__button', 'Export CSV');
  exportBtn.type = 'button';
  exportBtn.addEventListener('click', () => downloadCsv('skill-report.csv', tierTableToCsv(employees, proficiencyLevels, skillRarity)));
  toolbar.append(exportBtn);
  body.append(toolbar);

  renderTierTable(body, employees, proficiencyLevels, skillRarity);

  wrapper.append(body);
  block.append(wrapper);
}

/**
 * Restricts the employee list to the logged-in manager's direct reports.
 * When there is no authenticated user (local/preview, where auth is skipped)
 * the full list is returned so the view remains testable.
 * @param {Array} employees employees from the skill-report API
 * @param {object|null} user the IndexDB user record
 * @returns {Promise<Array>}
 */
async function filterToDirectReports(employees, user) {
  if (!user?.ldap) return employees;
  const reportKeys = new Set((await getDirectReports(user.ldap)).map((report) => report.ldap));
  return employees.filter((emp) => reportKeys.has(normalizeLdap(emp.email || emp.employeeId)));
}

export default async function decorate(block) {
  const config = readBlockConfig(block);
  block.textContent = '';
  block.append(createElement('p', 'report-table__loading', 'Loading skill report…'));

  let user = null;
  try {
    user = await getSessionUser();
  } catch { /* treat as unidentified */ }

  // Only verified managers may view this report. Outside test environments an
  // unidentified user (no SSO record) is denied as well.
  const allowed = user ? user.isManager : isTestEnvironment();
  if (!allowed) {
    window.location.replace('/');
    return;
  }

  try {
    const data = await getSkillReport();
    // Rarity is computed across the whole workforce before filtering to the team.
    const skillRarity = computeSkillRarity(data.employees);
    const employees = await filterToDirectReports(data.employees, user);

    if (employees.length === 0) {
      block.textContent = '';
      block.append(createElement('p', 'report-table__empty', 'No direct reports have submitted skills yet.'));
      return;
    }

    renderTable(block, config, { ...data, employees }, skillRarity);
  } catch {
    block.textContent = '';
    block.append(createElement('p', 'report-table__error', 'Failed to load skill report. Please try again.'));
  }
}
