import {
  buildSkillsPayload,
  getLevelFromExperienceMonths,
  submitSkillReport,
  getEmployeeSkillReport,
} from '../../scripts/api.js';
import { getUser } from '../../scripts/db.js';

function mapServerSkillToRow(skill) {
  const certification = skill.certification || null;
  return {
    skillName: skill.name,
    months: Number(skill.expInMonths) || 0,
    specializations: Array.isArray(skill.specializations) ? skill.specializations : [],
    cert: certification ? 'yes' : 'no',
    certTitle: certification?.certificateName || certification?.name || '',
    certImageUrl: certification?.certificateImageUrl || certification?.imageUrl || '',
  };
}

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

async function fetchSpecializations() {
  try {
    const res = await fetch('/specializations.json');
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data || []).map((r) => r.name).filter(Boolean);
  } catch {
    return [];
  }
}

function normalizeSkillName(name) {
  return name.trim().toLowerCase().replace(/[\s.]*\d+(\.\d+)*$/, '');
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

const multiPanelCleanups = new WeakMap();

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

function buildMultiSelect(options, initialValues, onChange) {
  let current = [...initialValues];

  const wrap = document.createElement('div');
  wrap.className = 'entry-form__multi-select';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'entry-form__multi-trigger';

  // Portal panel to body so it escapes any overflow:auto ancestor
  const panel = document.createElement('div');
  panel.className = 'entry-form__multi-panel';
  panel.hidden = true;
  document.body.append(panel);

  function updateTrigger() {
    trigger.textContent = current.length ? current.join(', ') : 'Select…';
  }

  function positionPanel() {
    const rect = trigger.getBoundingClientRect();
    panel.style.top = `${rect.bottom + 4}px`;
    panel.style.left = `${rect.left}px`;
    panel.style.width = `${rect.width}px`;
  }

  options.forEach((opt) => {
    const label = document.createElement('label');
    label.className = 'entry-form__multi-option';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = opt;
    cb.checked = current.includes(opt);
    cb.addEventListener('change', () => {
      current = cb.checked ? [...current, opt] : current.filter((v) => v !== opt);
      updateTrigger();
      onChange(current);
    });
    label.append(cb, document.createTextNode(` ${opt}`));
    panel.append(label);
  });

  const closeOnOutside = (e) => {
    if (!wrap.contains(e.target) && !panel.contains(e.target)) {
      panel.hidden = true;
      document.removeEventListener('click', closeOnOutside);
    }
  };

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (panel.hidden) {
      positionPanel();
      panel.hidden = false;
      document.addEventListener('click', closeOnOutside);
    } else {
      panel.hidden = true;
      document.removeEventListener('click', closeOnOutside);
    }
  });

  multiPanelCleanups.set(panel, () => {
    document.removeEventListener('click', closeOnOutside);
    panel.remove();
  });

  updateTrigger();
  wrap.append(trigger);
  return wrap;
}

export default async function decorate(block) {
  const config = readBlockConfig(block);
  const [user, skillList, specializationList] = await Promise.all([
    getUser(), fetchSkillList(), fetchSpecializations(),
  ]);

  const blankInput = () => ({
    skill: '', skillOther: '', months: 0, specializations: [], cert: '', certTitle: '', certImageUrl: '',
  });

  const state = {
    mode: 'form',
    busy: false,
    message: '',
    messageType: '',
    employeeId: user?.ldap || config['employee-id'] || 'robinvarshn',
    email: user?.email || `${user?.ldap || config['employee-id'] || 'robinvarshn'}@adobe.com`,
    name: user?.name || user?.ldap || config['employee-id'] || 'robinvarshn',
    rows: [],
    savedSkillNames: [],
    editingIndex: -1,
    input: blankInput(),
  };

  let render;

  function getInputSkillName() {
    return state.input.skill === 'other'
      ? state.input.skillOther.trim()
      : state.input.skill;
  }

  function validateInput() {
    const skillName = getInputSkillName();
    if (!skillName) throw new Error('Please select or type a skill.');
    const months = Number(state.input.months);
    if (!months || months < 1 || months > 1000) throw new Error('Please enter experience between 1 and 1000 months.');
    if (!state.input.cert) throw new Error('Please select Yes or No for Certification.');
    if (state.input.cert === 'yes' && !state.input.certTitle.trim()) {
      throw new Error('Please enter the Title of Certificate.');
    }
    const normalized = normalizeSkillName(skillName);
    const inCurrentRows = state.rows.some(
      (r, i) => normalizeSkillName(r.skillName) === normalized && i !== state.editingIndex,
    );
    const inSavedRows = state.savedSkillNames.some((n) => normalizeSkillName(n) === normalized);
    if (inCurrentRows || inSavedRows) throw new Error(`"${skillName}" has already been added.`);
  }

  function commitRow() {
    validateInput();
    const entry = {
      skillName: getInputSkillName(),
      months: Number(state.input.months),
      specializations: [...state.input.specializations],
      cert: state.input.cert,
      certTitle: state.input.certTitle.trim(),
      certImageUrl: state.input.certImageUrl,
    };
    if (state.editingIndex >= 0) {
      state.rows[state.editingIndex] = entry;
      state.editingIndex = -1;
    } else {
      state.rows.push(entry);
    }
    state.input = blankInput();
    state.message = '';
    state.messageType = '';
    render();
  }

  function deleteRow(i) {
    const deleted = state.rows[i];
    state.rows.splice(i, 1);
    state.savedSkillNames = state.savedSkillNames.filter(
      (n) => n.toLowerCase() !== deleted.skillName.toLowerCase(),
    );
    if (state.editingIndex === i) {
      state.editingIndex = -1;
      state.input = blankInput();
    } else if (state.editingIndex > i) {
      state.editingIndex -= 1;
    }
    render();
  }

  function editRow(i) {
    const s = state.rows[i];
    const isPreset = skillList.includes(s.skillName);
    state.input = {
      skill: isPreset ? s.skillName : 'other',
      skillOther: isPreset ? '' : s.skillName,
      months: s.months,
      specializations: [...(s.specializations || [])],
      cert: s.cert,
      certTitle: s.certTitle,
      certImageUrl: s.certImageUrl || '',
    };
    state.editingIndex = i;
    state.message = '';
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
      if (s.specializations && s.specializations.length) {
        entry.specializations = s.specializations;
      }
      if (s.cert === 'yes') {
        entry.certification = { name: s.certTitle };
        if (s.certImageUrl) entry.certification.imageUrl = s.certImageUrl;
      }
      return entry;
    }));
    return buildSkillsPayload(state.employeeId, state.email, state.name, skillsData);
  }

  async function loadSavedRows() {
    const res = await getEmployeeSkillReport(state.employeeId);
    const data = res?.data || {};
    if (data.email) state.email = data.email;
    if (data.name) state.name = data.name;
    state.rows = (data.skills || []).map(mapServerSkillToRow);
    state.savedSkillNames = state.rows.map((r) => r.skillName);
    state.editingIndex = -1;
    state.input = blankInput();
  }

  async function handleSubmit() {
    state.busy = true;
    state.message = '';
    state.messageType = '';
    render();
    try {
      const payload = await buildPayload();
      await submitSkillReport(payload);
      if (state.mode !== 'saved') {
        try {
          await loadSavedRows();
        } catch (loadErr) {
          // eslint-disable-next-line no-console
          console.error('Could not reload saved skills:', loadErr);
        }
      } else {
        state.savedSkillNames = state.rows.map((r) => r.skillName);
      }
      state.mode = 'saved';
      state.message = 'Changes saved successfully.';
      state.messageType = 'success';
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Submission failed:', err);
      const detail = err.status ? ` (HTTP ${err.status})` : '';
      state.message = `Submission failed${detail}. Check the browser console for details.`;
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
    expInput.placeholder = 'months';
    expInput.min = '1';
    expInput.max = '1000';
    expInput.value = state.input.months || '';
    expInput.addEventListener('input', (e) => { state.input.months = e.target.value; });
    expTd.append(expInput);
    tr.append(expTd);

    // ── Specialization (optional, multi-select) ──
    const specTd = document.createElement('td');
    specTd.append(buildMultiSelect(
      specializationList,
      state.input.specializations,
      (vals) => { state.input.specializations = vals; },
    ));
    tr.append(specTd);

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

    const dashWrap = document.createElement('div');
    dashWrap.className = 'entry-form__dash-center';
    dashWrap.append(certDash);

    certTitleWrap.style.display = state.input.cert === 'yes' ? 'block' : 'none';
    dashWrap.style.display = state.input.cert === 'yes' ? 'none' : '';

    certSel.addEventListener('change', (e) => {
      state.input.cert = e.target.value;
      if (e.target.value === 'yes') {
        certTitleWrap.style.display = 'block';
        dashWrap.style.display = 'none';
        titleInput.focus();
      } else {
        state.input.certTitle = '';
        titleInput.value = '';
        certTitleWrap.style.display = 'none';
        dashWrap.style.display = '';
      }
    });

    titleTd.append(certTitleWrap, dashWrap);
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

  function renderDataRows(showActions = true, showDelete = showActions) {
    return state.rows.map((s, i) => {
      const expLabel = `${s.months} month${s.months === 1 ? '' : 's'}`;

      const tr = document.createElement('tr');
      tr.className = `entry-form__data-row${state.editingIndex === i ? ' entry-form__data-row--editing' : ''}`;

      const skillTd = document.createElement('td');
      skillTd.append(createElement('span', 'entry-form__skill-chip', s.skillName));

      const expTd = createElement('td', 'entry-form__exp-cell', expLabel);

      const specTd = document.createElement('td');
      const slist = s.specializations || [];
      if (slist.length) {
        const chipsWrap = createElement('div', 'entry-form__spec-chips');
        slist.forEach((sp) => chipsWrap.append(createElement('span', 'entry-form__spec-chip', sp)));
        specTd.append(chipsWrap);
      } else {
        specTd.append(createElement('span', 'entry-form__dash', '—'));
      }

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

      const editBtn = document.createElement('button');
      editBtn.className = 'entry-form__icon-btn entry-form__icon-btn--edit';
      editBtn.type = 'button';
      editBtn.title = 'Edit';
      editBtn.setAttribute('aria-label', `Edit ${s.skillName}`);
      const editSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      editSvg.setAttribute('width', '16');
      editSvg.setAttribute('height', '16');
      editSvg.setAttribute('viewBox', '0 0 24 24');
      editSvg.setAttribute('fill', 'none');
      editSvg.setAttribute('stroke', 'currentColor');
      editSvg.setAttribute('stroke-width', '2');
      editSvg.setAttribute('stroke-linecap', 'round');
      editSvg.setAttribute('stroke-linejoin', 'round');
      editSvg.setAttribute('aria-hidden', 'true');
      const editPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      editPath.setAttribute('d', 'M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z');
      editSvg.append(editPath);
      editBtn.append(editSvg);
      editBtn.addEventListener('click', () => editRow(i));

      const delBtn = document.createElement('button');
      delBtn.className = 'entry-form__icon-btn entry-form__icon-btn--del';
      delBtn.type = 'button';
      delBtn.title = 'Delete';
      delBtn.setAttribute('aria-label', `Delete ${s.skillName}`);
      const delSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      delSvg.setAttribute('width', '13');
      delSvg.setAttribute('height', '13');
      delSvg.setAttribute('viewBox', '0 0 24 24');
      delSvg.setAttribute('fill', 'none');
      delSvg.setAttribute('stroke', 'currentColor');
      delSvg.setAttribute('stroke-width', '2');
      delSvg.setAttribute('stroke-linecap', 'round');
      delSvg.setAttribute('stroke-linejoin', 'round');
      delSvg.setAttribute('aria-hidden', 'true');
      const delPath1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      delPath1.setAttribute('d', 'M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6');
      const delPath2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      delPath2.setAttribute('d', 'M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2');
      delSvg.append(delPath1, delPath2);
      delBtn.append(delSvg);
      delBtn.addEventListener('click', () => deleteRow(i));

      const actionsWrap = createElement('div', 'entry-form__row-actions');
      actionsWrap.append(editBtn);
      if (showDelete) actionsWrap.append(delBtn);
      actionTd.append(actionsWrap);

      if (showActions) {
        tr.append(skillTd, expTd, specTd, certTd, titleTd, actionTd);
      } else {
        tr.append(skillTd, expTd, specTd, certTd, titleTd);
      }
      return tr;
    });
  }

  function renderTable(showActions = true, showInputRow = showActions, showDelete = showActions) {
    const tableWrap = createElement('div', 'entry-form__table-wrap');
    const table = document.createElement('table');
    table.className = 'entry-form__skills-table';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = ['Skill', 'Experience in Months', 'Specialization', 'Certification', 'Title of Certificate'];
    if (showActions) headers.push('');
    headers.forEach((label) => headerRow.append(createElement('th', '', label)));
    thead.append(headerRow);
    table.append(thead);

    const tbody = document.createElement('tbody');
    renderDataRows(showActions, showDelete).forEach((tr) => tbody.append(tr));
    table.append(tbody);

    if (showInputRow) {
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
    const submitBtn = createElement(
      'button',
      'entry-form__button entry-form__button--primary',
      state.busy ? 'Submitting…' : 'Submit',
    );
    submitBtn.type = 'button';
    submitBtn.disabled = state.rows.length === 0 || state.busy;
    submitBtn.addEventListener('click', handleSubmit);
    footer.append(submitBtn);
    wrapper.append(footer);
  }

  function renderSaved(wrapper) {
    const banner = createElement('div', 'entry-form__saved-banner');
    banner.append(
      createElement('span', 'entry-form__saved-icon', '✓'),
      createElement('span', 'entry-form__saved-text', 'Skills submitted successfully.'),
    );
    wrapper.append(banner);

    wrapper.append(createElement(
      'p',
      'entry-form__saved-sub',
      'Your saved skills are below. Edit or add any entry, then click Save changes.',
    ));

    if (state.messageType === 'error') renderMessage(wrapper);
    wrapper.append(renderTable(true, false, false));

    const footer = createElement('div', 'entry-form__form-footer');

    const addMoreBtn = createElement('button', 'entry-form__button', '+ Add more skills');
    addMoreBtn.type = 'button';
    addMoreBtn.disabled = state.busy;
    addMoreBtn.addEventListener('click', () => {
      state.mode = 'form';
      state.message = '';
      state.messageType = '';
      state.rows = [];
      state.editingIndex = -1;
      state.input = blankInput();
      render();
    });

    const saveBtn = createElement(
      'button',
      'entry-form__button entry-form__button--primary',
      state.busy ? 'Saving…' : 'Save changes',
    );
    saveBtn.type = 'button';
    saveBtn.disabled = state.rows.length === 0 || state.busy;
    saveBtn.addEventListener('click', handleSubmit);

    footer.append(addMoreBtn, saveBtn);
    wrapper.append(footer);
  }

  render = function renderEntryForm() {
    document.querySelectorAll('.entry-form__multi-panel').forEach((p) => multiPanelCleanups.get(p)?.());
    block.textContent = '';
    const wrapper = createElement('div', 'entry-form__wrapper');

    const header = createElement('div', 'entry-form__header');
    const displayName = state.name || state.employeeId;
    header.append(
      createElement('span', 'entry-form__heading-accent'),
      createElement('h2', 'entry-form__heading', displayName),
    );
    if (state.mode !== 'success') {
      header.append(createElement('p', 'entry-form__heading-sub', config.heading || 'Submit your skills'));
    }
    wrapper.append(header);

    const body = createElement('div', 'entry-form__body');
    if (state.mode === 'saved') {
      renderSaved(body);
    } else {
      renderForm(body);
    }
    wrapper.append(body);
    block.append(wrapper);
  };

  render();
}
