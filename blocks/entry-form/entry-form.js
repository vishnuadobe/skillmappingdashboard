import {
  buildSkillsPayload,
  getLevelFromExperienceMonths,
  submitEmployeeSkills,
} from '../../scripts/api.js';
import { MANAGERS, SKILL_CATALOG, getSkillById } from '../../scripts/skill-data.js';

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
  if (text) {
    element.textContent = text;
  }
  return element;
}

function toBoolean(value, defaultValue = false) {
  if (!value) {
    return defaultValue;
  }

  return value.toLowerCase() === 'true';
}

function readFileAsDataUri(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to read certificate file.'));
    reader.readAsDataURL(file);
  });
}

function createField(labelText, control) {
  const field = createElement('label', 'entry-form__field');
  const label = createElement('span', 'entry-form__label', labelText);
  field.append(label, control);
  return field;
}

function createRadioGroup(name, selectedValue) {
  const wrapper = createElement('div', 'entry-form__radio-group');
  ['yes', 'no'].forEach((value) => {
    const option = createElement('label', 'entry-form__radio');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = value;
    input.checked = value === selectedValue;
    const text = createElement('span', '', value === 'yes' ? 'Yes' : 'No');
    option.append(input, text);
    wrapper.append(option);
  });
  return wrapper;
}

function downloadBlob(filename, content, type) {
  const blob = new Blob([content], { type });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}

export default function decorate(block) {
  const config = readBlockConfig(block);
  const state = {
    mode: 'form',
    busy: false,
    message: '',
    messageType: '',
    simulateSubmit: toBoolean(config['simulate-submit'], true),
    values: {
      employeeId: config['employee-id'] || 'robinvarshn',
      managerId: config['manager-id'] || MANAGERS[0].id,
      skillId: String(SKILL_CATALOG[0].skillId),
      experienceMonths: '',
      certified: 'no',
      certificateFile: null,
      certificateDataUri: '',
    },
  };
  let render;

  function getSelectedManager() {
    return MANAGERS.find((entry) => entry.id === state.values.managerId) || MANAGERS[0];
  }

  function getSelectedSkill() {
    return getSkillById(Number(state.values.skillId)) || SKILL_CATALOG[0];
  }

  function getPreviewModel() {
    const skill = getSelectedSkill();
    const level = getLevelFromExperienceMonths(state.values.experienceMonths);
    const manager = getSelectedManager();

    return {
      employeeId: state.values.employeeId,
      manager,
      skill,
      experienceMonths: Number(state.values.experienceMonths),
      certified: state.values.certified === 'yes',
      level,
      certificateDataUri: state.values.certificateDataUri,
      payload: buildSkillsPayload(state.values.employeeId, [{
        skillId: skill.skillId,
        proficiencyLevel: level?.level || 1,
      }]),
    };
  }

  async function validateForm() {
    const errors = [];
    const months = Number(state.values.experienceMonths);

    if (!state.values.managerId) {
      errors.push('Reporting manager is required.');
    }

    if (!state.values.skillId) {
      errors.push('Skill name is required.');
    }

    if (!Number.isFinite(months) || months < 1 || months > 1000) {
      errors.push('Experience in months must be between 1 and 1000.');
    }

    if (!getLevelFromExperienceMonths(months)) {
      errors.push('A valid proficiency level could not be derived from experience.');
    }

    if (state.values.certified === 'yes') {
      const file = state.values.certificateFile;
      if (!file) {
        errors.push('Certificate upload is required when certification is Yes.');
      } else {
        if (file.size > 50 * 1024) {
          errors.push('Certificate file must be 50 KB or smaller.');
        }
        if (!file.type.startsWith('image/')) {
          errors.push('Certificate file must be an image.');
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(errors.join(' '));
    }

    state.values.certificateDataUri = state.values.certified === 'yes'
      ? await readFileAsDataUri(state.values.certificateFile)
      : '';
  }

  async function handlePreview(event) {
    event.preventDefault();
    state.message = '';
    state.messageType = '';

    try {
      await validateForm();
      state.mode = 'preview';
    } catch (error) {
      state.message = error.message;
      state.messageType = 'error';
    }

    render();
  }

  async function handleConfirm() {
    const preview = getPreviewModel();
    state.busy = true;
    state.message = '';
    state.messageType = '';
    render();

    try {
      if (!state.simulateSubmit) {
        await submitEmployeeSkills(preview.manager.id, preview.payload);
      }

      state.mode = 'success';
      state.message = state.simulateSubmit
        ? 'Mock submission saved. API call is still disabled for this environment.'
        : 'Submission saved successfully.';
      state.messageType = 'success';
    } catch (error) {
      state.message = 'Submission failed. Please try again once the API is available.';
      state.messageType = 'error';
    } finally {
      state.busy = false;
      render();
    }
  }

  function handleExportPreview() {
    const preview = getPreviewModel();
    downloadBlob(
      `${preview.employeeId}-skill-preview.json`,
      JSON.stringify(preview, null, 2),
      'application/json',
    );
  }

  function renderMessage(container) {
    if (!state.message) {
      return;
    }

    const message = createElement(
      'p',
      `entry-form__message entry-form__message--${state.messageType || 'info'}`,
      state.message,
    );
    container.append(message);
  }

  function renderForm(wrapper) {
    const intro = createElement(
      'p',
      'entry-form__intro',
      'Logins are out of scope for now, so this form uses a fixed employee id and focuses on the Phase 1 submission flow.',
    );
    wrapper.append(intro);

    const form = createElement('form', 'entry-form__form');

    const managerSelect = document.createElement('select');
    managerSelect.name = 'manager';
    MANAGERS.forEach((manager) => {
      const option = document.createElement('option');
      option.value = manager.id;
      option.textContent = manager.name;
      option.selected = manager.id === state.values.managerId;
      managerSelect.append(option);
    });
    managerSelect.addEventListener('change', (event) => {
      state.values.managerId = event.target.value;
    });
    form.append(createField('Reporting Manager', managerSelect));

    const skillSelect = document.createElement('select');
    skillSelect.name = 'skill';
    SKILL_CATALOG.forEach((skill) => {
      const option = document.createElement('option');
      option.value = String(skill.skillId);
      option.textContent = `${skill.skillName} (${skill.category})`;
      option.selected = String(skill.skillId) === state.values.skillId;
      skillSelect.append(option);
    });
    skillSelect.addEventListener('change', (event) => {
      state.values.skillId = event.target.value;
    });
    form.append(createField('Skill Name', skillSelect));

    const experienceInput = document.createElement('input');
    experienceInput.type = 'number';
    experienceInput.min = '1';
    experienceInput.max = '1000';
    experienceInput.value = state.values.experienceMonths;
    experienceInput.placeholder = 'e.g. 12';
    experienceInput.addEventListener('input', (event) => {
      state.values.experienceMonths = event.target.value;
    });
    form.append(createField('Experience in Months', experienceInput));

    const certificationGroup = createRadioGroup('certified', state.values.certified);
    certificationGroup.addEventListener('change', (event) => {
      state.values.certified = event.target.value;
      if (state.values.certified !== 'yes') {
        state.values.certificateFile = null;
        state.values.certificateDataUri = '';
        render();
      }
    });
    form.append(createField('Certification?', certificationGroup));

    if (state.values.certified === 'yes') {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/png,image/jpeg,image/webp';
      fileInput.addEventListener('change', (event) => {
        const [file] = event.target.files;
        state.values.certificateFile = file || null;
      });
      form.append(createField('Upload Certificate', fileInput));
    }

    const footer = createElement('div', 'entry-form__actions');
    const previewButton = createElement('button', 'entry-form__button entry-form__button--primary', 'Preview Submission');
    previewButton.type = 'submit';
    footer.append(previewButton);
    form.append(footer);

    form.addEventListener('submit', handlePreview);
    wrapper.append(form);
  }

  function renderPreview(wrapper) {
    const preview = getPreviewModel();
    const card = createElement('section', 'entry-form__preview');
    const heading = createElement('h3', 'entry-form__preview-heading', 'Preview your submission');
    const list = createElement('dl', 'entry-form__summary');

    [
      ['Employee ID', preview.employeeId],
      ['Reporting Manager', preview.manager.name],
      ['Skill', preview.skill.skillName],
      ['Category', preview.skill.category],
      ['Experience', `${preview.experienceMonths} months`],
      ['Derived Level', `${preview.level.level} - ${preview.level.label}`],
      ['Certified', preview.certified ? 'Yes' : 'No'],
    ].forEach(([labelText, value]) => {
      const row = createElement('div', 'entry-form__summary-row');
      row.append(createElement('dt', 'entry-form__summary-label', labelText));
      row.append(createElement('dd', 'entry-form__summary-value', value));
      list.append(row);
    });

    card.append(heading, list);

    if (preview.certificateDataUri) {
      const image = document.createElement('img');
      image.className = 'entry-form__certificate-preview';
      image.src = preview.certificateDataUri;
      image.alt = 'Uploaded certificate preview';
      card.append(image);
    }

    const actions = createElement('div', 'entry-form__actions');

    const backButton = createElement('button', 'entry-form__button', 'Back to form');
    backButton.type = 'button';
    backButton.addEventListener('click', () => {
      state.mode = 'form';
      render();
    });

    const exportButton = createElement('button', 'entry-form__button', 'Export Preview');
    exportButton.type = 'button';
    exportButton.addEventListener('click', handleExportPreview);

    const confirmButton = createElement(
      'button',
      'entry-form__button entry-form__button--primary',
      state.busy ? 'Saving...' : 'Confirm and Submit',
    );
    confirmButton.type = 'button';
    confirmButton.disabled = state.busy;
    confirmButton.addEventListener('click', handleConfirm);

    actions.append(backButton, exportButton, confirmButton);
    card.append(actions);
    wrapper.append(card);
  }

  function renderSuccess(wrapper) {
    const success = createElement('section', 'entry-form__success');
    success.append(createElement('h3', 'entry-form__preview-heading', 'Submission complete'));
    success.append(createElement(
      'p',
      'entry-form__intro',
      'The employee self-entry flow is now wired for preview, payload generation, and success handling.',
    ));

    const actions = createElement('div', 'entry-form__actions');
    const resetButton = createElement('button', 'entry-form__button entry-form__button--primary', 'Submit another skill');
    resetButton.type = 'button';
    resetButton.addEventListener('click', () => {
      state.mode = 'form';
      state.message = '';
      state.messageType = '';
      state.values.experienceMonths = '';
      state.values.certified = 'no';
      state.values.certificateFile = null;
      state.values.certificateDataUri = '';
      render();
    });
    actions.append(resetButton);
    success.append(actions);
    wrapper.append(success);
  }

  render = function renderEntryForm() {
    block.textContent = '';
    const wrapper = createElement('div', 'entry-form__wrapper');
    const heading = createElement('h2', 'entry-form__heading', config.heading || 'Skill Submission');
    const meta = createElement('p', 'entry-form__meta', `Employee ID: ${state.values.employeeId}`);

    wrapper.append(heading, meta);
    renderMessage(wrapper);

    if (state.mode === 'preview') {
      renderPreview(wrapper);
    } else if (state.mode === 'success') {
      renderSuccess(wrapper);
    } else {
      renderForm(wrapper);
    }

    block.textContent = '';
    block.append(wrapper);
  };

  render();
}
