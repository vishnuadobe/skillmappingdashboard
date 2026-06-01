import { getSkillReport } from '../../scripts/api.js';
import logout from '../../scripts/auth.js';

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

function buildMatrix(employees) {
  const skillNames = [...new Set(employees.flatMap((emp) => emp.skills.map((s) => s.name)))];
  const rows = employees.map((emp) => {
    const skillMap = {};
    emp.skills.forEach((s) => { skillMap[s.name] = s; });
    return { name: emp.name, email: emp.email, skillMap };
  });
  return { skillNames, rows };
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

function renderTable(block, config, data) {
  const { employees, metadata: { proficiencyLevels } } = data;
  const { skillNames, rows } = buildMatrix(employees);

  block.textContent = '';
  const wrapper = createElement('div', 'report-table__wrapper');

  const header = createElement('div', 'report-table__header');
  header.append(
    createElement('span', 'report-table__heading-accent'),
    createElement('h2', 'report-table__heading', config.heading || 'Manager Skill Report'),
    createElement('p', 'report-table__meta', 'Manager View'),
  );

  const logoutBtn = createElement('button', 'report-table__logout', 'Logout');
  logoutBtn.type = 'button';
  logoutBtn.addEventListener('click', logout);
  header.append(logoutBtn);

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
  const headerRow = document.createElement('tr');
  headerRow.append(createElement('th', 'report-table__col-employee', 'Employee'));
  skillNames.forEach((name) => headerRow.append(createElement('th', 'report-table__col-skill', name)));
  thead.append(headerRow);
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

export default async function decorate(block) {
  const config = readBlockConfig(block);
  block.textContent = '';
  block.append(createElement('p', 'report-table__loading', 'Loading skill report…'));

  try {
    const data = await getSkillReport();
    renderTable(block, config, data);
  } catch {
    block.textContent = '';
    block.append(createElement('p', 'report-table__error', 'Failed to load skill report. Please try again.'));
  }
}
