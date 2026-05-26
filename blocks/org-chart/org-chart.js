const ORG_DATA = {
  metadata: {
    version: '1.0',
    lastUpdatedAt: '2026-05-25T00:00:00Z',
  },
  manager: {
    managerId: 'atul-bansal',
    managerName: 'Atul Bansal',
    managerEmail: 'atulb@adobe.com',
    profileImageUrl: null,
    designation: 'Engineering Manager',
  },
  employees: [
    {
      employeeId: 'abaskaran',
      employeeName: 'Aravind Baskaran',
      emailAddress: 'abaskaran@adobe.com',
      profileImageUrl: null,
      designation: 'Sr Technical Consultant',
    },
    {
      employeeId: 'robinvarshn',
      employeeName: 'Robin Varshney',
      emailAddress: 'robinvarshn@adobe.com',
      profileImageUrl: null,
      designation: 'Sr Technical Consultant',
    },
    {
      employeeId: 'shivamsharma',
      employeeName: 'Shivam Sharma',
      emailAddress: 'shivamsharma@adobe.com',
      profileImageUrl: null,
      designation: 'Technical Consultant',
    },
    {
      employeeId: 'kahlid',
      employeeName: 'Mohamed Khalid',
      emailAddress: 'kahlid@adobe.com',
      profileImageUrl: null,
      designation: 'Technical Architect',
    },
    {
      employeeId: 'karpandu',
      employeeName: 'Karvannan Pandurangan',
      emailAddress: 'karpandu@adobe.com',
      profileImageUrl: null,
      designation: 'Sr Technical Consultant',
    },
    {
      employeeId: 'adarshn',
      employeeName: 'Adarsh Chandra Nanda',
      emailAddress: 'adarshn@adobe.com',
      profileImageUrl: null,
      designation: 'Sr Technical Consultant',
    },
    {
      employeeId: 'arulk',
      employeeName: 'Arul Kumar',
      emailAddress: 'arulk@adobe.com',
      profileImageUrl: null,
      designation: 'Technical Architect',
    },
    {
      employeeId: 'chethankuma',
      employeeName: 'Chethan Kumar',
      emailAddress: 'chethankuma@adobe.com',
      profileImageUrl: null,
      designation: 'Sr Technical Consultant',
    },
    {
      employeeId: 'khokhard',
      employeeName: 'Deepak khokha',
      emailAddress: 'khokhard@adobe.com',
      profileImageUrl: null,
      designation: 'Technical Architect',
    },
    {
      employeeId: 'vvenkateshku',
      employeeName: 'Vigneshwaran Venkateshkuma',
      emailAddress: 'vvenkateshku@adobe.com',
      profileImageUrl: null,
      designation: 'Sr Technical Consultant',
    },
    {
      employeeId: 'varundixit',
      employeeName: 'Varun Dixit',
      emailAddress: 'varundixit@adobe.com',
      profileImageUrl: null,
      designation: 'Sr Technical Consultant',
    },
    {
      employeeId: 'svishwakarma',
      employeeName: 'Sanjay Vishwakarma',
      emailAddress: 'svishwakarma@adobe.com',
      profileImageUrl: null,
      designation: 'Sr Technical Consultant',
    },
  ],
};

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

function getInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

function createAvatar(name, imageUrl) {
  const avatar = document.createElement('div');
  avatar.className = 'org-chart__avatar';

  if (imageUrl) {
    const image = document.createElement('img');
    image.src = imageUrl;
    image.alt = `${name} profile`;
    avatar.append(image);
    return avatar;
  }

  const initials = document.createElement('span');
  initials.textContent = getInitials(name);
  avatar.append(initials);
  return avatar;
}

function createPersonCard(person, options = {}) {
  const {
    isManager = false,
    reportCount = 0,
    profilePath = '/skill-profile',
  } = options;

  const card = document.createElement('a');
  card.className = 'org-chart__card';
  card.href = `${profilePath}?employeeId=${encodeURIComponent(person.id)}`;
  card.setAttribute('aria-label', `Open ${person.name}'s skill profile`);
  if (isManager) {
    card.classList.add('org-chart__card--manager');
  }

  card.append(createAvatar(person.name, person.profileImageUrl));

  const body = document.createElement('div');
  body.className = 'org-chart__card-body';

  const name = document.createElement('h3');
  name.className = 'org-chart__name';
  name.textContent = person.name;
  body.append(name);

  const title = document.createElement('p');
  title.className = 'org-chart__title';
  title.textContent = person.designation;
  body.append(title);

  if (isManager) {
    const badge = document.createElement('p');
    badge.className = 'org-chart__badge';
    badge.textContent = `${reportCount} direct report${reportCount === 1 ? '' : 's'}`;
    body.append(badge);
  }

  card.append(body);
  return card;
}

function createEmptyState(message) {
  const emptyState = document.createElement('p');
  emptyState.className = 'org-chart__message';
  emptyState.textContent = message;
  return emptyState;
}

function normalizeData(data) {
  return {
    manager: {
      id: data.manager.managerId,
      name: data.manager.managerName,
      email: data.manager.managerEmail,
      profileImageUrl: data.manager.profileImageUrl,
      designation: data.manager.designation,
    },
    employees: data.employees.map((employee) => ({
      id: employee.employeeId,
      name: employee.employeeName,
      email: employee.emailAddress,
      profileImageUrl: employee.profileImageUrl,
      designation: employee.designation,
    })),
  };
}

export default function decorate(block) {
  const config = readBlockConfig(block);
  const headingText = config.heading || 'Skill Navigator';
  const view = (config.view || 'manager').toLowerCase();
  const userId = config['user-id'] || ORG_DATA.manager.managerId;
  const profilePath = config['profile-path'] || '/skill-profile';

  const { manager, employees } = normalizeData(ORG_DATA);

  block.textContent = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'org-chart__wrapper';

  const header = document.createElement('div');
  header.className = 'org-chart__header';

  const heading = document.createElement('h2');
  heading.className = 'org-chart__heading';
  heading.textContent = headingText;
  header.append(heading);

  wrapper.append(header);

  if (view !== 'manager') {
    wrapper.append(createEmptyState('Employee view will be added next. Use view "manager" for now.'));
    block.append(wrapper);
    return;
  }

  if (userId !== manager.id) {
    wrapper.append(createEmptyState(`No mock manager data found for "${userId}". Try "${manager.id}".`));
    block.append(wrapper);
    return;
  }

  const chart = document.createElement('div');
  chart.className = 'org-chart__tree';

  const root = document.createElement('div');
  root.className = 'org-chart__root';
  root.append(createPersonCard(manager, {
    isManager: true,
    reportCount: employees.length,
    profilePath,
  }));
  chart.append(root);

  const branch = document.createElement('div');
  branch.className = 'org-chart__branch';

  const list = document.createElement('ul');
  list.className = 'org-chart__reports';

  employees.forEach((employee) => {
    const item = document.createElement('li');
    item.className = 'org-chart__report';
    item.append(createPersonCard(employee, { profilePath }));
    list.append(item);
  });

  branch.append(list);
  chart.append(branch);
  wrapper.append(chart);
  block.append(wrapper);
}
