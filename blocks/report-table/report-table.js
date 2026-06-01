import { getLevelFromExperienceMonths } from '../../scripts/api.js';
import {
  MANAGERS,
  MOCK_SUBMISSIONS,
  getSkillById,
} from '../../scripts/skill-data.js';

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

function buildMatrix() {
  const skillIdOrder = [...new Set(MOCK_SUBMISSIONS.map((e) => e.skillId))];
  const skills = skillIdOrder.map((id) => getSkillById(id)).filter(Boolean);

  const employeeMap = {};
  MOCK_SUBMISSIONS.forEach((entry) => {
    if (!employeeMap[entry.employeeId]) {
      employeeMap[entry.employeeId] = { id: entry.employeeId, name: entry.employeeName, skills: {} };
    }
    const level = getLevelFromExperienceMonths(entry.experienceMonths);
    employeeMap[entry.employeeId].skills[entry.skillId] = { level, certified: entry.certified };
  });

  return { skills, employees: Object.values(employeeMap) };
}

function toCsv(matrix) {
  const header = ['Employee', ...matrix.skills.map((s) => s.skillName)];
  const rows = matrix.employees.map((emp) => [
    emp.name,
    ...matrix.skills.map((s) => emp.skills[s.skillId]?.level?.label || '—'),
  ]);
  return [header, ...rows]
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

function createLevelBadge(levelObj) {
  if (!levelObj) {
    const badge = createElement('span', 'report-table__badge report-table__badge--none', '—');
    return badge;
  }
  const badge = createElement('span', `report-table__badge report-table__badge--l${levelObj.level}`, levelObj.label);
  return badge;
}

export default function decorate(block) {
  const config = readBlockConfig(block);
  const manager = MANAGERS[0];
  const matrix = buildMatrix();

  block.textContent = '';
  const wrapper = createElement('div', 'report-table__wrapper');

  // Header
  const header = createElement('div', 'report-table__header');
  header.append(
    createElement('span', 'report-table__heading-accent'),
    createElement('h2', 'report-table__heading', config.heading || `Welcome, ${manager.name}`),
    createElement('p', 'report-table__meta', 'Manager View'),
  );
  wrapper.append(header);

  // Body
  const body = createElement('div', 'report-table__body');

  // Legend + export row
  const toolbar = createElement('div', 'report-table__toolbar');

  const legend = createElement('div', 'report-table__legend');
  [
    ['l1', 'Foundational'],
    ['l2', 'Developing'],
    ['l3', 'Professional'],
    ['l4', 'Expert'],
    ['l5', 'Master'],
  ].forEach(([mod, label]) => {
    const item = createElement('span', 'report-table__legend-item');
    item.append(createElement('span', `report-table__badge report-table__badge--${mod}`, label));
    legend.append(item);
  });
  toolbar.append(legend);

  const exportBtn = createElement('button', 'report-table__button', 'Export CSV');
  exportBtn.type = 'button';
  exportBtn.addEventListener('click', () => downloadCsv('skill-matrix.csv', toCsv(matrix)));
  toolbar.append(exportBtn);
  body.append(toolbar);

  // Table
  const tableWrapper = createElement('div', 'report-table__table-wrapper');
  const table = createElement('table', 'report-table__table');

  // Head
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headerRow.append(createElement('th', 'report-table__col-employee', 'Employee'));
  matrix.skills.forEach((skill) => {
    const th = createElement('th', 'report-table__col-skill', skill.skillName);
    headerRow.append(th);
  });
  thead.append(headerRow);
  table.append(thead);

  // Body
  const tbody = document.createElement('tbody');
  matrix.employees.forEach((emp) => {
    const tr = document.createElement('tr');
    tr.append(createElement('td', 'report-table__cell-employee', emp.name));
    matrix.skills.forEach((skill) => {
      const entry = emp.skills[skill.skillId];
      const td = document.createElement('td');
      td.append(createLevelBadge(entry?.level));
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
