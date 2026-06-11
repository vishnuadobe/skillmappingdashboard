import {
  buildSkillsPayload,
  getLevelFromExperienceMonths,
  submitSkillReport,
  getEmployeeSkillReport,
} from '../../scripts/api.js';
import { getSessionUser } from '../../scripts/auth.js';

function parseSpecializations(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value.split(',').map((v) => v.trim()).filter(Boolean);
  return [];
}

function mapServerSkillToRow(skill) {
  const certification = skill.certification || null;
  return {
    skillName: skill.name,
    months: Number(skill.expInMonths) || 0,
    // Backend sends a comma-separated `specialization` string; the UI uses an array.
    specializations: parseSpecializations(skill.specialization ?? skill.specializations),
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
  // Strip a trailing version token so "HTML" and "HTML5" match, but keep it when
  // doing so would leave too short a stem — so names where the trailing digits are
  // part of the identity (e.g. "ES6", "S3") aren't collapsed away.
  const base = name.trim().toLowerCase();
  const stripped = base.replace(/[\s.]*\d+(\.\d+)*$/, '');
  return stripped.length >= 3 ? stripped : base;
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
    getSessionUser(), fetchSkillList(), fetchSpecializations(),
  ]);
  const blankInput = () => ({
    skill: '', skillOther: '', months: 0, specializations: [], cert: '', certTitle: '', certImageUrl: '',
  });

  const state = {
    busy: false,
    message: '',
    messageType: '',
    employeeId: user?.ldap || config['employee-id'] || 'robinvarshn',
    email: user?.email || `${user?.ldap || config['employee-id'] || 'robinvarshn'}@adobe.com`,
    name: user?.name || user?.ldap || config['employee-id'] || 'robinvarshn',
    rows: [],
    savedRows: [],
    savedSkillNames: [],
    // Index in `state.rows` being edited inline (pending change, not yet POSTed)
    editingIndex: -1,
    // Index in `state.savedRows` being edited inline — Save POSTs immediately
    // and refreshes the previously-submitted list.
    editingSavedIndex: -1,
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
    // Block duplicates within the current form, but allow re-adding a previously saved
    // skill — that re-add is appended/overridden on submit (handled server-side on merge).
    const normalized = normalizeSkillName(skillName);
    const inCurrentRows = state.rows.some(
      (r, i) => normalizeSkillName(r.skillName) === normalized && i !== state.editingIndex,
    );
    if (inCurrentRows) throw new Error(`"${skillName}" already exists in this form.`);
    // Duplicate check against already-saved skills disabled — re-adds are allowed:
    // const editingName = state.editingIndex >= 0
    //   ? normalizeSkillName(state.rows[state.editingIndex].skillName)
    //   : null;
    // const inSavedRows = state.savedSkillNames.some(
    //   (n) => normalizeSkillName(n) === normalized && normalizeSkillName(n) !== editingName,
    // );
    // if (inSavedRows) throw new Error(`"${skillName}" has already been added.`);
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
    let info = '';
    if (state.editingIndex >= 0) {
      state.rows[state.editingIndex] = entry;
      state.editingIndex = -1;
    } else {
      state.rows.push(entry);
      // Re-adding a previously saved skill — flag that it will update the saved entry
      const isSavedReAdd = state.savedSkillNames.some(
        (n) => normalizeSkillName(n) === normalizeSkillName(entry.skillName),
      );
      if (isSavedReAdd) {
        info = `"${entry.skillName}" already exists — it will be updated with the new values on submit.`;
      }
    }
    state.input = blankInput();
    state.message = info;
    state.messageType = info ? 'info' : '';
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
    state.editingSavedIndex = -1;
    state.message = '';
    render();
  }

  function cancelEdit() {
    state.editingIndex = -1;
    state.editingSavedIndex = -1;
    state.input = blankInput();
    state.message = '';
    state.messageType = '';
    render();
  }

  // Loads the employee's already-submitted skills for the
  // "Previously submitted skills" list shown below the form. Pass
  // `{ silent: true }` from callers that will render themselves afterwards
  // (e.g. handleSubmit, saveSavedRowEdit) to avoid an extra repaint with
  // a stale `state.rows`.
  async function loadPreviousEntries({ silent = false } = {}) {
    try {
      const res = await getEmployeeSkillReport(state.employeeId);
      const data = res?.data || {};
      if (data.email) state.email = data.email;
      if (data.name) state.name = data.name;
      state.savedRows = (data.skills || []).map(mapServerSkillToRow);
      state.savedSkillNames = state.savedRows.map((r) => r.skillName);
      if (!silent) render();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Could not load previous entries:', err);
    }
  }

  // Pre-fills the input row from a previously-submitted skill so the user can
  // edit it. The form's bottom input row is hidden while this is active and the
  // input row appears inline at that saved row's position.
  function editSavedRow(i) {
    const s = state.savedRows[i];
    if (!s) return;
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
    state.editingIndex = -1;
    state.editingSavedIndex = i;
    state.message = '';
    state.messageType = '';
    render();
  }

  // Option B: clicking Save on a saved-row edit POSTs that single skill
  // immediately and refreshes the previously-submitted list. Validation errors
  // throw so the click handler's outer catch surfaces them as a red banner.
  async function saveSavedRowEdit() {
    validateInput();
    state.busy = true;
    state.message = '';
    state.messageType = '';
    render();
    try {
      const skillName = getInputSkillName();
      const months = Number(state.input.months);
      const level = await getLevelFromExperienceMonths(months);
      const skill = {
        name: skillName,
        expInMonths: months,
        proficiencyLevel: level?.level || 1,
      };
      if (state.input.specializations?.length) {
        skill.specializations = [...state.input.specializations];
      }
      if (state.input.cert === 'yes') {
        skill.certification = { name: state.input.certTitle.trim() };
        if (state.input.certImageUrl) skill.certification.imageUrl = state.input.certImageUrl;
      }
      const payload = buildSkillsPayload(state.employeeId, state.email, state.name, [skill]);
      await submitSkillReport(payload);
      await loadPreviousEntries({ silent: true });
      state.editingSavedIndex = -1;
      state.input = blankInput();
      state.message = `"${skillName}" updated successfully.`;
      state.messageType = 'success';
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Saved-row edit failed:', err);
      const status = err.status ? ` (HTTP ${err.status})` : '';
      const reason = err.detail || err.message;
      state.message = reason
        ? `Update failed${status}: ${reason}`
        : `Update failed${status}. Check the browser console for details.`;
      state.messageType = 'error';
    } finally {
      state.busy = false;
      render();
    }
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

  async function handleSubmit() {
    state.busy = true;
    state.message = '';
    state.messageType = '';
    render();
    try {
      const payload = await buildPayload();
      await submitSkillReport(payload);
      // Refresh the previously-submitted list from the server so the user sees
      // their just-submitted skills there. Pending `state.rows` is cleared so
      // the form is ready for the next entries.
      await loadPreviousEntries({ silent: true });
      state.rows = [];
      state.editingIndex = -1;
      state.input = blankInput();
      state.message = 'Skills submitted successfully.';
      state.messageType = 'success';
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Submission failed:', err);
      const status = err.status ? ` (HTTP ${err.status})` : '';
      const reason = err.detail || err.message;
      state.message = reason
        ? `Submission failed${status}: ${reason}`
        : `Submission failed${status}. Check the browser console for details.`;
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
    skillSel.style.display = state.input.skill === 'other' ? 'none' : '';

    const otherInput = document.createElement('input');
    otherInput.type = 'text';
    otherInput.className = 'entry-form__input';
    otherInput.placeholder = 'Type your skill…';
    otherInput.value = state.input.skillOther;
    otherInput.style.display = state.input.skill === 'other' ? '' : 'none';
    otherInput.addEventListener('input', (e) => { state.input.skillOther = e.target.value; });

    skillSel.addEventListener('change', (e) => {
      state.input.skill = e.target.value;
      if (e.target.value !== 'other') {
        state.input.skillOther = '';
        skillSel.style.display = '';
        otherInput.style.display = 'none';
        otherInput.value = '';
      } else {
        skillSel.style.display = 'none';
        otherInput.style.display = '';
        otherInput.focus();
      }
    });

    skillTd.append(skillSel, otherInput);
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
    specTd.className = 'entry-form__spec-td';
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

    // ── Add / Save (+ Cancel) buttons ──
    const addTd = document.createElement('td');
    addTd.className = 'entry-form__action-cell';
    const isEditingPending = state.editingIndex >= 0;
    const isEditingSaved = state.editingSavedIndex >= 0;
    const isEditing = isEditingPending || isEditingSaved;
    const addBtn = createElement('button', 'entry-form__add-btn', isEditing ? 'Save' : '+ Add');
    addBtn.type = 'button';
    if (state.busy) addBtn.disabled = true;
    addBtn.addEventListener('click', async () => {
      try {
        if (isEditingSaved) await saveSavedRowEdit();
        else commitRow();
      } catch (err) {
        state.message = err.message;
        state.messageType = 'error';
        render();
      }
    });
    if (isEditing) {
      const editActions = createElement('div', 'entry-form__edit-actions');
      const cancelBtn = createElement('button', 'entry-form__cancel-btn', 'Cancel');
      cancelBtn.type = 'button';
      if (state.busy) cancelBtn.disabled = true;
      cancelBtn.addEventListener('click', cancelEdit);
      editActions.append(addBtn, cancelBtn);
      addTd.append(editActions);
    } else {
      addTd.append(addBtn);
    }
    tr.append(addTd);

    return tr;
  }

  function renderDataRows(rows, showActions = true, showDelete = showActions, tableKind = 'form') {
    return rows.map((s, i) => {
      // Editing happens inline — replace the data row with the input row. The
      // swap is gated on which table this is so the form table only swaps for
      // a pending-row edit and the saved table only for a saved-row edit.
      if (showActions && tableKind === 'form' && state.editingIndex === i) return renderInputRow();
      if (showActions && tableKind === 'saved' && state.editingSavedIndex === i) return renderInputRow();

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
      editBtn.addEventListener('click', () => (
        tableKind === 'saved' ? editSavedRow(i) : editRow(i)
      ));

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

  function renderTable(
    rows,
    showActions = true,
    showInputRow = showActions,
    showDelete = showActions,
    tableKind = 'form',
  ) {
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
    renderDataRows(rows, showActions, showDelete, tableKind).forEach((tr) => tbody.append(tr));
    table.append(tbody);

    // The form table's bottom input row hides whenever an inline edit is
    // active on either table — the input row appears at the editing row instead.
    if (showInputRow && state.editingIndex < 0 && state.editingSavedIndex < 0) {
      const tfoot = document.createElement('tfoot');
      tfoot.append(renderInputRow());
      table.append(tfoot);
    }

    tableWrap.append(table);
    return tableWrap;
  }

  function renderPreviousEntries(wrapper) {
    if (!state.savedRows.length) return;
    const section = createElement('div', 'entry-form__previous');
    section.append(createElement('h3', 'entry-form__previous-title', 'Previously submitted skills'));
    // Edit allowed (✏ → inline edit, Save POSTs immediately). Delete is not
    // shown yet — backend has no DELETE endpoint, see progress.md.
    section.append(renderTable(state.savedRows, true, false, false, 'saved'));
    wrapper.append(section);
  }

  function renderForm(wrapper) {
    renderMessage(wrapper);
    wrapper.append(renderTable(state.rows, true));

    const footer = createElement('div', 'entry-form__form-footer');
    const submitBtn = createElement(
      'button',
      'entry-form__button entry-form__button--primary',
      state.busy ? 'Submitting…' : 'Submit',
    );
    submitBtn.type = 'button';
    // Disable Submit while a saved-row edit is in flight so the form doesn't
    // race with the immediate-save POST.
    submitBtn.disabled = state.rows.length === 0 || state.busy || state.editingSavedIndex >= 0;
    submitBtn.addEventListener('click', handleSubmit);
    footer.append(submitBtn);
    wrapper.append(footer);

    renderPreviousEntries(wrapper);
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
      createElement('p', 'entry-form__heading-sub', config.heading || 'Submit your skills'),
    );
    wrapper.append(header);

    const body = createElement('div', 'entry-form__body');
    renderForm(body);
    wrapper.append(body);
    block.append(wrapper);
  };

  render();
  loadPreviousEntries();
}
