import {
  buildSkillsPayload,
  getLevelFromExperienceMonths,
  submitSkillReport,
} from '../../scripts/api.js';
import { getUser } from '../../scripts/db.js';

async function fetchSkillList() {
  try {
    const res = await fetch('/skills.json');
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data || []).map((r) => r.name).filter(Boolean);
  } catch {
    return [];
  }
}

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
  if (text) el.textContent = text;
  return el;
}

function buildSelect(options, currentValue) {
  const sel = document.createElement('select');
  sel.className = 'entry-form__select';
  options.forEach(({ value, label }) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    if (value === String(currentValue)) opt.selected = true;
    sel.append(opt);
  });
  return sel;
}

export default async function decorate(block) {
  const config = readBlockConfig(block);
  const [user, skillList] = await Promise.all([getUser(), fetchSkillList()]);

  const state = {
    mode: 'form',
    busy: false,
    message: '',
    messageType: '',
    employeeId: user?.ldap || config['employee-id'] || 'robinvarshn',
    email: user?.email || '',
    name: user?.name || '',
    rows: [],
    editingIndex: -1,
    input: {
      skill: '', skillOther: '', months: 0, cert: '', certTitle: '',
    },
  };

  let render;

  function getInputSkillName() {
    return state.input.skill === 'other'
      ? state.input.skillOther.trim()
      : state.input.skill;
  }

  function validateInput() {
    if (!getInputSkillName()) throw new Error('Please select or type a skill.');
    const months = Number(state.input.months);
    if (!months || months < 1 || months > 1000) throw new Error('Please enter experience between 1 and 1000 months.');
    if (!state.input.cert) throw new Error('Please select Yes or No for Certification.');
    if (state.input.cert === 'yes' && !state.input.certTitle.trim()) {
      throw new Error('Please enter the Title of Certificate.');
    }
  }

  function commitRow() {
    validateInput();
    const entry = {
      skillName: getInputSkillName(),
      months: Number(state.input.months),
      cert: state.input.cert,
      certTitle: state.input.certTitle.trim(),
    };
    if (state.editingIndex >= 0) {
      state.rows[state.editingIndex] = entry;
      state.editingIndex = -1;
    } else {
      state.rows.push(entry);
    }
    state.input = {
      skill: '', skillOther: '', months: 0, cert: '', certTitle: '',
    };
    state.message = '';
    state.messageType = '';
    render();
  }

  function editRow(i) {
    const s = state.rows[i];
    const isPreset = skillList.includes(s.skillName);
    state.input = {
      skill: isPreset ? s.skillName : 'other',
      skillOther: isPreset ? '' : s.skillName,
      months: s.months,
      cert: s.cert,
      certTitle: s.certTitle,
    };
    state.editingIndex = i;
    state.message = '';
    render();
  }

  function deleteRow(i) {
    state.rows.splice(i, 1);
    if (state.editingIndex === i) {
      state.editingIndex = -1;
      state.input = {
        skill: '', skillOther: '', months: 0, cert: '', certTitle: '',
      };
    } else if (state.editingIndex > i) {
      state.editingIndex -= 1;
    }
    render();
  }

  async function buildPayload() {
    const skillsData = await Promise.all(state.rows.map(async (s) => {
      const level = await getLevelFromExperienceMonths(s.months);
      const entry = {
        name: s.skillName,
        expInMonths: s.months,
        proficiencyLevel: level?.level || 1,
      };
      if (s.cert === 'yes') {
        entry.certification = { name: s.certTitle, imageUrl: '' };
      }
      return entry;
    }));
    return buildSkillsPayload(state.employeeId, state.email, state.name, skillsData);
  }

  async function handleSubmit() {
    state.busy = true;
    state.message = '';
    state.messageType = '';
    render();
    try {
      const payload = await buildPayload();
      await submitSkillReport(payload);
      state.mode = 'success';
      state.message = 'Submission saved successfully.';
      state.messageType = 'success';
    } catch {
      state.message = 'Submission failed. Please try again.';
      state.messageType = 'error';
    } finally {
      state.busy = false;
      render();
    }
  }

  function renderMessage(container) {
    if (!state.message) return;
    container.append(createElement(
      'p',
      `entry-form__message entry-form__message--${state.messageType || 'info'}`,
      state.message,
    ));
  }

  function renderInputRow() {
    const tr = document.createElement('tr');
    tr.className = `entry-form__input-row${state.editingIndex >= 0 ? ' entry-form__input-row--editing' : ''}`;

    // ── Skill ──
    const skillTd = document.createElement('td');
    const skillOpts = [
      { value: '', label: 'Select skill…' },
      ...skillList.map((n) => ({ value: n, label: n })),
      { value: 'other', label: 'Other…' },
    ];
    const skillSel = buildSelect(skillOpts, state.input.skill);

    const otherWrap = createElement('div', 'entry-form__other-wrap');
    otherWrap.style.display = state.input.skill === 'other' ? 'block' : 'none';
    const otherInput = document.createElement('input');
    otherInput.type = 'text';
    otherInput.className = 'entry-form__input entry-form__other-input';
    otherInput.placeholder = 'Type your skill…';
    otherInput.value = state.input.skillOther;
    otherInput.addEventListener('input', (e) => { state.input.skillOther = e.target.value; });
    otherWrap.append(otherInput);

    skillSel.addEventListener('change', (e) => {
      state.input.skill = e.target.value;
      if (e.target.value !== 'other') {
        state.input.skillOther = '';
        otherWrap.style.display = 'none';
        otherInput.value = '';
      } else {
        otherWrap.style.display = 'block';
        otherInput.focus();
      }
    });

    skillTd.append(skillSel, otherWrap);
    tr.append(skillTd);

    // ── Experience ──
    const expTd = document.createElement('td');
    const expInput = document.createElement('input');
    expInput.type = 'number';
    expInput.className = 'entry-form__input';
    expInput.placeholder = 'e.g. 12';
    expInput.min = '1';
    expInput.max = '1000';
    expInput.value = state.input.months || '';
    expInput.addEventListener('input', (e) => { state.input.months = e.target.value; });
    expTd.append(expInput);
    tr.append(expTd);

    // ── Certification ──
    const certTd = document.createElement('td');
    const certSel = buildSelect([
      { value: '', label: 'Select…' },
      { value: 'no', label: 'No' },
      { value: 'yes', label: 'Yes' },
    ], state.input.cert);
    certTd.append(certSel);
    tr.append(certTd);

    // ── Title of Certificate ──
    const titleTd = document.createElement('td');
    const certTitleWrap = createElement('div', 'entry-form__cert-title-wrap');
    const certDash = createElement('span', 'entry-form__dash', '—');
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'entry-form__input';
    titleInput.placeholder = 'e.g. AWS Certified Developer';
    titleInput.value = state.input.certTitle;
    titleInput.addEventListener('input', (e) => { state.input.certTitle = e.target.value; });
    certTitleWrap.append(titleInput);

    if (state.input.cert === 'yes') {
      certTitleWrap.style.display = 'block';
      certDash.style.display = 'none';
    } else {
      certTitleWrap.style.display = 'none';
    }

    certSel.addEventListener('change', (e) => {
      state.input.cert = e.target.value;
      if (e.target.value === 'yes') {
        certTitleWrap.style.display = 'block';
        certDash.style.display = 'none';
        titleInput.focus();
      } else {
        state.input.certTitle = '';
        titleInput.value = '';
        certTitleWrap.style.display = 'none';
        certDash.style.display = '';
      }
    });

    titleTd.append(certTitleWrap, certDash);
    tr.append(titleTd);

    // ── Add / Save button ──
    const addTd = document.createElement('td');
    addTd.className = 'entry-form__action-cell';
    const addBtn = createElement(
      'button',
      'entry-form__add-btn',
      state.editingIndex >= 0 ? 'Save' : '+ Add',
    );
    addBtn.type = 'button';
    addBtn.addEventListener('click', () => {
      try {
        commitRow();
      } catch (err) {
        state.message = err.message;
        state.messageType = 'error';
        render();
      }
    });
    addTd.append(addBtn);
    tr.append(addTd);

    return tr;
  }

  function renderDataRows() {
    return state.rows.map((s, i) => {
      const expLabel = `${s.months} month${s.months === 1 ? '' : 's'}`;

      const tr = document.createElement('tr');
      tr.className = `entry-form__data-row${state.editingIndex === i ? ' entry-form__data-row--editing' : ''}`;

      const skillTd = document.createElement('td');
      skillTd.append(createElement('span', 'entry-form__skill-chip', s.skillName));

      const expTd = createElement('td', 'entry-form__exp-cell', expLabel);

      const certTd = document.createElement('td');
      certTd.append(createElement(
        'span',
        `entry-form__cert-badge entry-form__cert-badge--${s.cert}`,
        s.cert === 'yes' ? 'Yes' : 'No',
      ));

      const titleTd = document.createElement('td');
      if (s.cert === 'yes') {
        titleTd.append(createElement('strong', 'entry-form__cert-title', s.certTitle));
      } else {
        titleTd.append(createElement('span', 'entry-form__dash', '—'));
      }

      const actionTd = document.createElement('td');
      actionTd.className = 'entry-form__action-cell';
      const actionsWrap = createElement('div', 'entry-form__row-actions');

      const editBtn = createElement('button', 'entry-form__icon-btn entry-form__icon-btn--edit', '✏');
      editBtn.type = 'button';
      editBtn.setAttribute('aria-label', `Edit ${s.skillName}`);
      editBtn.addEventListener('click', () => editRow(i));

      const delBtn = createElement('button', 'entry-form__icon-btn entry-form__icon-btn--del', '×');
      delBtn.type = 'button';
      delBtn.setAttribute('aria-label', `Remove ${s.skillName}`);
      delBtn.addEventListener('click', () => deleteRow(i));

      actionsWrap.append(editBtn, delBtn);
      actionTd.append(actionsWrap);

      tr.append(skillTd, expTd, certTd, titleTd, actionTd);
      return tr;
    });
  }

  function renderTable(showActions = true) {
    const tableWrap = createElement('div', 'entry-form__table-wrap');
    const table = document.createElement('table');
    table.className = 'entry-form__skills-table';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = ['Skill', 'Experience', 'Certification', 'Title of Certificate'];
    if (showActions) headers.push('');
    headers.forEach((label) => headerRow.append(createElement('th', '', label)));
    thead.append(headerRow);
    table.append(thead);

    const tbody = document.createElement('tbody');
    if (state.rows.length === 0 && showActions) {
      const emptyTr = document.createElement('tr');
      const emptyTd = document.createElement('td');
      emptyTd.colSpan = 5;
      emptyTd.className = 'entry-form__empty-cell';
      emptyTd.append(createElement('div', 'entry-form__empty-state', 'No skills added yet — fill in the row below and click + Add'));
      emptyTr.append(emptyTd);
      tbody.append(emptyTr);
    } else {
      renderDataRows().forEach((tr) => tbody.append(tr));
    }
    table.append(tbody);

    if (showActions) {
      const tfoot = document.createElement('tfoot');
      tfoot.append(renderInputRow());
      table.append(tfoot);
    }

    tableWrap.append(table);
    return tableWrap;
  }

  function renderForm(wrapper) {
    renderMessage(wrapper);
    wrapper.append(renderTable(true));

    const footer = createElement('div', 'entry-form__form-footer');
    const countEl = createElement('span', 'entry-form__skill-count', `${state.rows.length} skill(s) added`);
    const submitBtn = createElement(
      'button',
      'entry-form__button entry-form__button--primary',
      state.busy ? 'Submitting…' : 'Submit',
    );
    submitBtn.type = 'button';
    submitBtn.disabled = state.rows.length === 0 || state.busy;
    submitBtn.addEventListener('click', handleSubmit);
    footer.append(countEl, submitBtn);
    wrapper.append(footer);
  }

  function renderSuccess(wrapper) {
    renderMessage(wrapper);
    const success = createElement('div', 'entry-form__success');
    success.append(createElement('h3', 'entry-form__preview-heading', 'Submission complete'));
    success.append(createElement('p', '', 'Your skills have been recorded. You can submit more skills using the button below.'));
    const actions = createElement('div', 'entry-form__actions');
    const resetBtn = createElement('button', 'entry-form__button entry-form__button--primary', 'Submit more skills');
    resetBtn.type = 'button';
    resetBtn.addEventListener('click', () => {
      state.mode = 'form';
      state.message = '';
      state.messageType = '';
      state.rows = [];
      state.editingIndex = -1;
      state.input = {
        skill: '', skillOther: '', months: 0, cert: '', certTitle: '',
      };
      render();
    });
    actions.append(resetBtn);
    success.append(actions);
    wrapper.append(success);
  }

  render = function renderEntryForm() {
    block.textContent = '';
    const wrapper = createElement('div', 'entry-form__wrapper');

    const header = createElement('div', 'entry-form__header');
    header.append(
      createElement('span', 'entry-form__heading-accent'),
      createElement('h2', 'entry-form__heading', config.heading || 'Submit your skills'),
      createElement('p', 'entry-form__meta', state.name || state.employeeId),
    );
    wrapper.append(header);

    const body = createElement('div', 'entry-form__body');
    if (state.mode === 'success') {
      renderSuccess(body);
    } else {
      renderForm(body);
    }
    wrapper.append(body);
    block.append(wrapper);
  };

  render();
}
