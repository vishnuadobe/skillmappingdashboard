import { getLevelFromExperienceMonths } from '../../scripts/api.js';
import {
  MANAGERS,
  MOCK_SUBMISSIONS,
  SKILL_CATALOG,
  getSkillById,
} from '../../scripts/skill-data.js';

function readBlockConfig(block) {
  return [...block.children].reduce((config, row) => {
    const cells = [...row.children];
    if (cells.length < 2) {
      return config;
    }

    const key = cells[0].textContent.trim().toLowerCase();
    const value = cells[1].textContent.trim();

    if (key) {
      config[key] = value;
    }

    return config;
  }, {});
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (typeof text === 'string') {
    element.textContent = text;
  }
  return element;
}

function toCsv(rows) {
  return rows.map((row) => row
    .map((value) => `"${String(value).replaceAll('"', '""')}"`)
    .join(','))
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

function normalizeRows() {
  return MOCK_SUBMISSIONS.map((entry) => {
    const skill = getSkillById(entry.skillId);
    const level = getLevelFromExperienceMonths(entry.experienceMonths);

    return {
      employee: entry.employeeName,
      skill: skill?.skillName || 'Unknown Skill',
      experienceMonths: entry.experienceMonths,
      level: level ? `${level.level} — ${level.label}` : 'Not mapped',
      certified: entry.certified ? 'Yes' : 'No',
    };
  });
}

export default function decorate(block) {
  const config = readBlockConfig(block);
  const manager = MANAGERS[0];
  const state = {
    skill: 'All',
    level: 'All',
  };
  let render;

  const rows = normalizeRows();
  const levelOptions = [...new Set(rows.map((entry) => entry.level))];

  function getFilteredRows() {
    return rows.filter((row) => {
      if (state.skill !== 'All' && row.skill !== state.skill) {
        return false;
      }
      if (state.level !== 'All' && row.level !== state.level) {
        return false;
      }
      return true;
    });
  }

  function buildSelect(labelText, value, options, onChange) {
    const field = createElement('label', 'report-table__filter');
    field.append(createElement('span', 'report-table__filter-label', labelText));

    const select = document.createElement('select');
    options.forEach((optionValue) => {
      const option = document.createElement('option');
      option.value = optionValue;
      option.textContent = optionValue;
      option.selected = optionValue === value;
      select.append(option);
    });
    select.addEventListener('change', (event) => {
      onChange(event.target.value);
      render();
    });

    field.append(select);
    return field;
  }

  function handleExport() {
    const filteredRows = getFilteredRows();
    const csvRows = [
      ['Employee', 'Skill', 'Experience (Months)', 'Level', 'Certified'],
      ...filteredRows.map((row) => [
        row.employee,
        row.skill,
        row.experienceMonths,
        row.level,
        row.certified,
      ]),
    ];

    downloadCsv('skill-report.csv', toCsv(csvRows));
  }

  render = function renderReportTable() {
    block.textContent = '';

    const wrapper = createElement('div', 'report-table__wrapper');

    // Header
    const header = createElement('div', 'report-table__header');
    const accent = createElement('span', 'report-table__heading-accent');
    const heading = createElement('h2', 'report-table__heading', config.heading || `Welcome, ${manager.name}`);
    const meta = createElement('p', 'report-table__meta', 'Manager View');
    header.append(accent, heading, meta);
    wrapper.append(header);

    // Body
    const body = createElement('div', 'report-table__body');

    const filteredRows = getFilteredRows();

    const controls = createElement('div', 'report-table__controls');
    controls.append(
      buildSelect(
        'Skill',
        state.skill,
        ['All', ...SKILL_CATALOG.map((entry) => entry.skillName)],
        (nextValue) => { state.skill = nextValue; },
      ),
      buildSelect(
        'Level',
        state.level,
        ['All', ...levelOptions],
        (nextValue) => { state.level = nextValue; },
      ),
    );

    const exportButton = createElement('button', 'report-table__button', 'Export CSV');
    exportButton.type = 'button';
    exportButton.addEventListener('click', handleExport);
    controls.append(exportButton);
    body.append(controls);

    const count = createElement(
      'p',
      'report-table__count',
      `${filteredRows.length} submission${filteredRows.length === 1 ? '' : 's'}`,
    );
    body.append(count);

    const tableWrapper = createElement('div', 'report-table__table-wrapper');
    const table = createElement('table', 'report-table__table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Employee', 'Skill', 'Experience (Months)', 'Level', 'Certified'].forEach((label) => {
      headerRow.append(createElement('th', '', label));
    });
    thead.append(headerRow);
    table.append(thead);

    const tbody = document.createElement('tbody');
    filteredRows.forEach((row) => {
      const tr = document.createElement('tr');
      [
        row.employee,
        row.skill,
        String(row.experienceMonths),
        row.level,
        row.certified,
      ].forEach((value) => {
        tr.append(createElement('td', '', value));
      });
      tbody.append(tr);
    });

    if (filteredRows.length === 0) {
      const emptyRow = document.createElement('tr');
      const emptyCell = createElement('td', 'report-table__empty', 'No submissions match the current filters.');
      emptyCell.colSpan = 5;
      emptyRow.append(emptyCell);
      tbody.append(emptyRow);
    }

    table.append(tbody);
    tableWrapper.append(table);
    body.append(tableWrapper);
    wrapper.append(body);
    block.append(wrapper);
  };

  render();
}
