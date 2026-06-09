import { getSkillReport } from '../../scripts/api.js';
import { getSessionUser, isTestEnvironment } from '../../scripts/auth.js';
import { getDirectReports, normalizeLdap } from '../../scripts/employee-mapping.js';
import buildViewToggle from '../../scripts/view-toggle.js';

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

function buildMatrix(employees, skillRarity) {
  const skillNames = [...new Set(employees.flatMap((emp) => emp.skills.map((s) => s.name)))];
  // Rarest skills first (lowest workforce share), alphabetical within a tier.
  skillNames.sort((a, b) => {
    const shareA = skillRarity?.get(a)?.share ?? 1;
    const shareB = skillRarity?.get(b)?.share ?? 1;
    return shareA - shareB || a.localeCompare(b);
  });
  const rows = employees.map((emp) => {
    const skillMap = {};
    emp.skills.forEach((s) => { skillMap[s.name] = s; });
    return { name: emp.name, email: emp.email, skillMap };
  });
  return { skillNames, rows };
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

function createLevelBadge(skill, proficiencyLevels) {
  if (!skill) return createElement('span', 'report-table__badge report-table__badge--none', '—');
  const label = getLevelLabel(proficiencyLevels, skill.proficiencyLevel);
  return createElement('span', `report-table__badge report-table__badge--l${skill.proficiencyLevel}`, label);
}

function toCsv(skillNames, rows, proficiencyLevels) {
  const header = ['Employee', 'Email', ...skillNames];
  const dataRows = rows.map((row) => [
    row.name,
    row.email,
    ...skillNames.map((name) => {
      const skill = row.skillMap[name];
      return skill ? getLevelLabel(proficiencyLevels, skill.proficiencyLevel) : '—';
    }),
  ]);
  return [header, ...dataRows]
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

function renderTable(block, config, data, skillRarity) {
  const { employees, metadata: { proficiencyLevels } } = data;
  const { skillNames, rows } = buildMatrix(employees, skillRarity);

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
  exportBtn.addEventListener('click', () => downloadCsv('skill-report.csv', toCsv(skillNames, rows, proficiencyLevels)));
  toolbar.append(exportBtn);
  body.append(toolbar);

  const tableWrapper = createElement('div', 'report-table__table-wrapper');
  const table = createElement('table', 'report-table__table');

  const thead = document.createElement('thead');

  // Banner row: Employee spans both header rows, then one cell per rarity tier
  // spanning its skills. Columns are sorted rarest-first, so same-tier skills
  // are contiguous and can be collapsed into colspan groups.
  const groupRow = document.createElement('tr');
  const employeeTh = createElement('th', 'report-table__col-employee', 'Employee');
  employeeTh.rowSpan = 2;
  groupRow.append(employeeTh);

  const groups = [];
  skillNames.forEach((name) => {
    const tier = skillRarity?.get(name)?.tier;
    const id = tier?.id || 'unknown';
    const last = groups[groups.length - 1];
    if (last && last.id === id) last.count += 1;
    else groups.push({ id, label: tier?.label || '', count: 1 });
  });
  groups.forEach((group) => {
    const th = createElement('th', `report-table__group report-table__group--${group.id}`, group.label);
    th.colSpan = group.count;
    groupRow.append(th);
  });
  thead.append(groupRow);

  // Skill-name row.
  const nameRow = document.createElement('tr');
  skillNames.forEach((name) => {
    const th = createElement('th', 'report-table__col-skill', name);
    const info = skillRarity?.get(name);
    if (info) th.title = `Held by ${info.holders} of ${info.total} employees (${Math.round(info.share * 100)}%)`;
    nameRow.append(th);
  });
  thead.append(nameRow);
  table.append(thead);

  const tbody = document.createElement('tbody');
  rows.forEach((row) => {
    const tr = document.createElement('tr');
    tr.append(createElement('td', 'report-table__cell-employee', row.name));
    skillNames.forEach((name) => {
      const td = document.createElement('td');
      td.append(createLevelBadge(row.skillMap[name], proficiencyLevels));
      tr.append(td);
    });
    tbody.append(tr);
  });
  table.append(tbody);

  tableWrapper.append(table);
  body.append(tableWrapper);
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
      block.prepend(buildViewToggle('report'));
      return;
    }

    renderTable(block, config, { ...data, employees }, skillRarity);
    block.prepend(buildViewToggle('report'));
  } catch {
    block.textContent = '';
    block.append(createElement('p', 'report-table__error', 'Failed to load skill report. Please try again.'));
  }
}
