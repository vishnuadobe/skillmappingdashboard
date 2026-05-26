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

// TODO: replace hardcoded data with GET /api/v1/managers/{managerId}/employees/skills
const EMPLOYEES = [
  {
    id: 'atul-bansal',
    name: 'Atul Bansal',
    designation: 'Engineering Manager',
    department: 'ACS',
    email: 'atulb@adobe.com',
    skills: [
      { skillId: 1, proficiencyLevel: 4 },
      { skillId: 2, proficiencyLevel: 4 },
      { skillId: 3, proficiencyLevel: 4 },
      { skillId: 4, proficiencyLevel: 3 },
      { skillId: 5, proficiencyLevel: 3 },
      { skillId: 10, proficiencyLevel: 4 },
      { skillId: 15, proficiencyLevel: 5 },
      { skillId: 18, proficiencyLevel: 3 },
    ],
  },
  {
    id: 'abaskaran',
    name: 'Aravind Baskaran',
    designation: 'Sr Technical Consultant',
    department: 'ACS',
    email: 'abaskaran@adobe.com',
    skills: [
      { skillId: 1, proficiencyLevel: 3 },
      { skillId: 2, proficiencyLevel: 3 },
      { skillId: 3, proficiencyLevel: 3 },
      { skillId: 4, proficiencyLevel: 2 },
      { skillId: 5, proficiencyLevel: 3 },
      { skillId: 10, proficiencyLevel: 2 },
      { skillId: 15, proficiencyLevel: 3 },
      { skillId: 18, proficiencyLevel: 2 },
    ],
  },
  {
    id: 'priya',
    name: 'Priya Sharma',
    designation: 'Technical Consultant',
    department: 'ACS',
    email: 'priya@adobe.com',
    skills: [
      { skillId: 1, proficiencyLevel: 4 },
      { skillId: 2, proficiencyLevel: 3 },
      { skillId: 3, proficiencyLevel: 4 },
      { skillId: 4, proficiencyLevel: 3 },
      { skillId: 5, proficiencyLevel: 4 },
      { skillId: 9, proficiencyLevel: 2 },
      { skillId: 10, proficiencyLevel: 3 },
      { skillId: 15, proficiencyLevel: 2 },
    ],
  },
  {
    id: 'robin',
    name: 'Robin Varsh',
    designation: 'Assoc Technical Consultant',
    department: 'EDS',
    email: 'robin@adobe.com',
    skills: [
      { skillId: 1, proficiencyLevel: 2 },
      { skillId: 2, proficiencyLevel: 2 },
      { skillId: 3, proficiencyLevel: 3 },
      { skillId: 5, proficiencyLevel: 2 },
      { skillId: 15, proficiencyLevel: 2 },
    ],
  },
  {
    id: 'meena',
    name: 'Meena Pillai',
    designation: 'Sr Technical Consultant',
    department: 'ACS',
    email: 'meena@adobe.com',
    skills: [
      { skillId: 1, proficiencyLevel: 4 },
      { skillId: 2, proficiencyLevel: 4 },
      { skillId: 3, proficiencyLevel: 4 },
      { skillId: 4, proficiencyLevel: 4 },
      { skillId: 5, proficiencyLevel: 4 },
      { skillId: 6, proficiencyLevel: 3 },
      { skillId: 9, proficiencyLevel: 3 },
      { skillId: 10, proficiencyLevel: 3 },
      { skillId: 12, proficiencyLevel: 3 },
      { skillId: 15, proficiencyLevel: 4 },
    ],
  },
];

const SKILLS_CATALOGUE = [
  { skillId: 1, name: 'HTML5', category: 'Generic Skill' },
  { skillId: 2, name: 'CSS3', category: 'Generic Skill' },
  { skillId: 3, name: 'JavaScript (ES6+)', category: 'Generic Skill' },
  { skillId: 4, name: 'TypeScript', category: 'Niche Skill' },
  { skillId: 5, name: 'ReactJS / AngularJS / VueJS', category: 'Niche Skill' },
  { skillId: 6, name: 'ReactNative / FlutterJS', category: 'Super Niche' },
  { skillId: 7, name: 'iOS / Android Development', category: 'Ultra Niche' },
  { skillId: 8, name: 'SvelteJS', category: 'Ultra Niche' },
  { skillId: 9, name: 'Next.js', category: 'Super Niche' },
  { skillId: 10, name: 'API Integration / GraphQL', category: 'Niche Skill' },
  { skillId: 11, name: 'Node.js', category: 'Ultra Niche' },
  { skillId: 12, name: 'Webpack / Vite / Build Tools', category: 'Niche Skill' },
  { skillId: 13, name: 'Unit Testing (Jest, Vitest)', category: 'Niche Skill' },
  { skillId: 14, name: 'Progressive Web Apps (PWA)', category: 'Ultra Niche' },
  { skillId: 15, name: 'Adobe EDS', category: 'Niche Skill' },
  { skillId: 16, name: 'ElectronJS', category: 'Ultra Niche' },
  { skillId: 17, name: 'Magento', category: 'Super Niche' },
  { skillId: 18, name: 'AdobeIO', category: 'Niche Skill' },
];

const EXPECTED_LEVELS = {
  1: 4,
  2: 4,
  3: 4,
  4: 3,
  5: 3,
  9: 2,
  10: 3,
  15: 3,
  18: 2,
};

const LEVEL_NAMES = ['Not assessed', 'Foundational', 'Developing', 'Professional', 'Expert', 'Master'];

const CATEGORIES = ['Generic Skill', 'Niche Skill', 'Super Niche', 'Ultra Niche'];

const FILTER_OPTIONS = ['All', ...CATEGORIES];

function getInitials(name) {
  const parts = name.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return `${first}${last}`.toUpperCase();
}

function getEmployeeIdFromUrl() {
  return new URLSearchParams(window.location.search).get('emp');
}

function getLevelName(level) {
  return LEVEL_NAMES[level] || 'Not assessed';
}

function createButton(text, variant = 'secondary') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `skill-profile__button skill-profile__button--${variant}`;
  button.textContent = text;
  return button;
}

function createEmptyState(message) {
  const emptyState = document.createElement('p');
  emptyState.className = 'skill-profile__empty';
  emptyState.textContent = message;
  return emptyState;
}

function buildSkillMap(skills) {
  return skills.reduce((map, skill) => {
    map[skill.skillId] = skill.proficiencyLevel;
    return map;
  }, {});
}

function buildProfileSkills(skillsMap) {
  return SKILLS_CATALOGUE.map((skill) => ({
    ...skill,
    actual: skillsMap[skill.skillId] || 0,
    expected: EXPECTED_LEVELS[skill.skillId] || 0,
  }));
}

function createAvatar(name) {
  const avatar = document.createElement('div');
  avatar.className = 'skill-profile__avatar';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = getInitials(name);
  return avatar;
}

function createHeader(employee, canEdit) {
  const header = document.createElement('section');
  header.className = 'skill-profile__header';

  const identity = document.createElement('div');
  identity.className = 'skill-profile__identity';
  identity.append(createAvatar(employee.name));

  const content = document.createElement('div');
  content.className = 'skill-profile__identity-content';

  const name = document.createElement('h2');
  name.className = 'skill-profile__name';
  name.textContent = employee.name;
  content.append(name);

  const title = document.createElement('p');
  title.className = 'skill-profile__title';
  title.textContent = `${employee.designation} | ${employee.department}`;
  content.append(title);

  const email = document.createElement('a');
  email.className = 'skill-profile__email';
  email.href = `mailto:${employee.email}`;
  email.textContent = employee.email;
  content.append(email);

  identity.append(content);
  header.append(identity);

  if (canEdit) {
    const actions = document.createElement('div');
    actions.className = 'skill-profile__header-actions';

    const button = createButton('Edit skills');
    button.classList.add('skill-profile__edit-toggle');
    actions.append(button);
    header.append(actions);
  }

  return header;
}

function createFilter(state, refresh) {
  const controls = document.createElement('div');
  controls.className = 'skill-profile__controls';

  const filterLabel = document.createElement('label');
  filterLabel.className = 'skill-profile__filter-label';
  filterLabel.setAttribute('for', 'skill-profile-category-filter');
  filterLabel.textContent = 'Filter by category';

  const filterSelect = document.createElement('select');
  filterSelect.id = 'skill-profile-category-filter';
  filterSelect.className = 'skill-profile__filter-select';

  FILTER_OPTIONS.forEach((option) => {
    const optionElement = document.createElement('option');
    optionElement.value = option;
    optionElement.textContent = option;
    optionElement.selected = option === state.activeFilter;
    filterSelect.append(optionElement);
  });

  filterSelect.addEventListener('change', (event) => {
    state.activeFilter = event.target.value;
    refresh();
  });

  controls.append(filterLabel, filterSelect);
  return controls;
}

function createDots(actual, expected) {
  const dots = document.createElement('div');
  dots.className = 'skill-profile__dots';
  dots.setAttribute('aria-label', `Current level ${actual} of 5, expected level ${expected} of 5`);

  for (let index = 1; index <= 5; index += 1) {
    const dot = document.createElement('span');
    dot.className = 'skill-profile__dot';

    if (index <= actual) {
      dot.classList.add('skill-profile__dot--actual');
    } else if (index <= expected) {
      dot.classList.add('skill-profile__dot--expected');
    }

    dots.append(dot);
  }

  return dots;
}

function createSegmentedControl(skill, currentValue, onChange) {
  const control = document.createElement('div');
  control.className = 'skill-profile__segments';
  control.setAttribute('role', 'group');
  control.setAttribute('aria-label', `${skill.name} proficiency level`);

  const values = [0, 1, 2, 3, 4, 5];
  values.forEach((value) => {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'skill-profile__segment';
    option.textContent = value === 0 ? '-' : String(value);
    option.setAttribute('aria-pressed', String(value === currentValue));

    if (value === currentValue) {
      option.classList.add('is-active');
    }

    option.addEventListener('click', () => onChange(skill.skillId, value));
    control.append(option);
  });

  return control;
}

function createSkillRow(skill, state, refresh) {
  const row = document.createElement('div');
  row.className = 'skill-profile__row';

  const name = document.createElement('div');
  name.className = 'skill-profile__skill-name';
  name.textContent = skill.name;
  row.append(name);

  const middle = document.createElement('div');
  middle.className = 'skill-profile__skill-indicator';

  const currentValue = state.draft[skill.skillId] ?? 0;
  if (state.isEditing) {
    middle.append(createSegmentedControl(skill, currentValue, (skillId, value) => {
      state.draft[skillId] = value;
      refresh();
    }));
  } else {
    middle.append(createDots(currentValue, skill.expected));
  }

  row.append(middle);

  const label = document.createElement('div');
  label.className = 'skill-profile__skill-level';
  label.textContent = getLevelName(currentValue);
  row.append(label);

  return row;
}

function createSkillSection(category, skills, state, refresh) {
  const section = document.createElement('section');
  section.className = 'skill-profile__section';

  const header = document.createElement('div');
  header.className = 'skill-profile__section-header';

  const heading = document.createElement('h3');
  heading.className = 'skill-profile__section-title';
  heading.textContent = category;
  header.append(heading);

  const count = document.createElement('span');
  count.className = 'skill-profile__count';
  count.textContent = `${skills.length} skills`;
  header.append(count);

  section.append(header);

  const body = document.createElement('div');
  body.className = 'skill-profile__section-body';
  skills.forEach((skill) => body.append(createSkillRow(skill, state, refresh)));
  section.append(body);

  return section;
}

function createActionBar(state, refresh) {
  if (!state.isEditing) {
    return null;
  }

  const bar = document.createElement('div');
  bar.className = 'skill-profile__action-bar';

  const cancelButton = createButton('Cancel');
  cancelButton.addEventListener('click', () => {
    state.draft = { ...state.saved };
    state.isEditing = false;
    refresh();
  });

  const updateButton = createButton('Update', 'primary');
  updateButton.addEventListener('click', () => {
    state.saved = { ...state.draft };
    state.isEditing = false;
    // TODO: replace with POST /api/v1/managers/{managerId}/employees/skills
    refresh();
  });

  bar.append(cancelButton, updateButton);
  return bar;
}

function renderProfile(block, employee, canEdit) {
  const state = {
    isEditing: false,
    activeFilter: 'All',
    saved: buildSkillMap(employee.skills),
    draft: buildSkillMap(employee.skills),
  };

  const skills = buildProfileSkills(state.saved);

  const refresh = () => {
    block.textContent = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'skill-profile__wrapper';

    const header = createHeader(employee, canEdit);
    const editButton = header.querySelector('.skill-profile__edit-toggle');

    if (editButton) {
      editButton.textContent = state.isEditing ? 'Editing...' : 'Edit skills';
      editButton.classList.toggle('is-editing', state.isEditing);
      editButton.disabled = state.isEditing;

      if (state.isEditing) {
        const badge = document.createElement('span');
        badge.className = 'skill-profile__editing-badge';
        badge.textContent = 'In progress';
        editButton.append(badge);
      } else {
        editButton.addEventListener('click', () => {
          state.draft = { ...state.saved };
          state.isEditing = true;
          refresh();
        });
      }
    }

    wrapper.append(header);

    wrapper.append(createFilter(state, refresh));

    CATEGORIES.forEach((category) => {
      if (state.activeFilter !== 'All' && state.activeFilter !== category) {
        return;
      }

      const categorySkills = skills.filter((skill) => skill.category === category);
      wrapper.append(createSkillSection(category, categorySkills, state, refresh));
    });

    const actionBar = createActionBar(state, refresh);
    if (actionBar) {
      wrapper.append(actionBar);
    }

    block.append(wrapper);
  };

  refresh();
}

export default function decorate(block) {
  const config = readBlockConfig(block);
  const employeeId = getEmployeeIdFromUrl() || config['employee-id'] || '';
  const role = (config.role || 'employee').toLowerCase();
  const employee = EMPLOYEES.find((entry) => entry.id === employeeId);

  block.textContent = '';

  if (!employee) {
    block.append(createEmptyState('Employee not found'));
    return;
  }

  renderProfile(block, employee, role === 'manager');
}
