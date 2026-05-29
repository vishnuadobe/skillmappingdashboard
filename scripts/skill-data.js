export const MANAGERS = [
  { id: 'atul-bansal', name: 'Atul Bansal' },
];

export const SKILL_CATALOG = [
  { skillId: 1, skillName: 'HTML5', category: 'Generic Skill' },
  { skillId: 2, skillName: 'CSS3', category: 'Generic Skill' },
  { skillId: 3, skillName: 'JavaScript (ES6+)', category: 'Generic Skill' },
  { skillId: 4, skillName: 'TypeScript', category: 'Niche Skill' },
  { skillId: 5, skillName: 'ReactJS / AngularJS / VueJS', category: 'Niche Skill' },
  { skillId: 6, skillName: 'ReactNative / FlutterJS', category: 'Super Niche' },
  { skillId: 7, skillName: 'iOS / Android Development', category: 'Ultra Niche' },
  { skillId: 8, skillName: 'SvelteJS', category: 'Ultra Niche' },
  { skillId: 9, skillName: 'Next.js', category: 'Super Niche' },
  { skillId: 10, skillName: 'API Integration / GraphQL', category: 'Niche Skill' },
  { skillId: 11, skillName: 'Node.js (Frontend Integration Level)', category: 'Ultra Niche' },
  { skillId: 12, skillName: 'Webpack / Vite / Build Tools', category: 'Niche Skill' },
  { skillId: 13, skillName: 'Unit Testing (Jest, Vitest, Jasmine)', category: 'Niche Skill' },
  { skillId: 14, skillName: 'Progressive Web Apps (PWA)', category: 'Ultra Niche' },
  { skillId: 15, skillName: 'Adobe EDS (Edge Delivery Services)', category: 'Niche Skill' },
  { skillId: 16, skillName: 'ElectronJS', category: 'Ultra Niche' },
  { skillId: 17, skillName: 'Magento', category: 'Super Niche' },
  { skillId: 18, skillName: 'AdobeIO', category: 'Niche Skill' },
];

export const MOCK_SUBMISSIONS = [
  // Aravind Baskaran
  { employeeId: 'abaskaran', employeeName: 'Aravind Baskaran', skillId: 1, experienceMonths: 36, certified: true },
  { employeeId: 'abaskaran', employeeName: 'Aravind Baskaran', skillId: 2, experienceMonths: 30, certified: false },
  { employeeId: 'abaskaran', employeeName: 'Aravind Baskaran', skillId: 3, experienceMonths: 36, certified: true },
  { employeeId: 'abaskaran', employeeName: 'Aravind Baskaran', skillId: 4, experienceMonths: 18, certified: false },
  { employeeId: 'abaskaran', employeeName: 'Aravind Baskaran', skillId: 15, experienceMonths: 18, certified: true },

  // Robin Varshney
  { employeeId: 'robinvarshn', employeeName: 'Robin Varshney', skillId: 3, experienceMonths: 36, certified: true },
  { employeeId: 'robinvarshn', employeeName: 'Robin Varshney', skillId: 4, experienceMonths: 24, certified: true },
  { employeeId: 'robinvarshn', employeeName: 'Robin Varshney', skillId: 5, experienceMonths: 22, certified: false },
  { employeeId: 'robinvarshn', employeeName: 'Robin Varshney', skillId: 9, experienceMonths: 22, certified: true },
  { employeeId: 'robinvarshn', employeeName: 'Robin Varshney', skillId: 10, experienceMonths: 18, certified: false },

  // Shivam Sharma
  { employeeId: 'shivamsharma', employeeName: 'Shivam Sharma', skillId: 1, experienceMonths: 24, certified: false },
  { employeeId: 'shivamsharma', employeeName: 'Shivam Sharma', skillId: 3, experienceMonths: 24, certified: true },
  { employeeId: 'shivamsharma', employeeName: 'Shivam Sharma', skillId: 4, experienceMonths: 12, certified: false },
  { employeeId: 'shivamsharma', employeeName: 'Shivam Sharma', skillId: 10, experienceMonths: 14, certified: false },

  // Mohamed Khalid
  { employeeId: 'kahlid', employeeName: 'Mohamed Khalid', skillId: 1, experienceMonths: 36, certified: true },
  { employeeId: 'kahlid', employeeName: 'Mohamed Khalid', skillId: 2, experienceMonths: 36, certified: false },
  { employeeId: 'kahlid', employeeName: 'Mohamed Khalid', skillId: 3, experienceMonths: 30, certified: true },
  { employeeId: 'kahlid', employeeName: 'Mohamed Khalid', skillId: 4, experienceMonths: 18, certified: false },
  { employeeId: 'kahlid', employeeName: 'Mohamed Khalid', skillId: 15, experienceMonths: 14, certified: true },

  // Adarsh Chandra Nanda
  { employeeId: 'adarshn', employeeName: 'Adarsh Chandra Nanda', skillId: 1, experienceMonths: 30, certified: false },
  { employeeId: 'adarshn', employeeName: 'Adarsh Chandra Nanda', skillId: 3, experienceMonths: 30, certified: true },
  { employeeId: 'adarshn', employeeName: 'Adarsh Chandra Nanda', skillId: 12, experienceMonths: 11, certified: true },
  { employeeId: 'adarshn', employeeName: 'Adarsh Chandra Nanda', skillId: 15, experienceMonths: 22, certified: true },

  // Arul Kumar
  { employeeId: 'arulk', employeeName: 'Arul Kumar', skillId: 1, experienceMonths: 36, certified: true },
  { employeeId: 'arulk', employeeName: 'Arul Kumar', skillId: 2, experienceMonths: 30, certified: false },
  { employeeId: 'arulk', employeeName: 'Arul Kumar', skillId: 3, experienceMonths: 36, certified: true },
  { employeeId: 'arulk', employeeName: 'Arul Kumar', skillId: 15, experienceMonths: 16, certified: false },

  // Chethan Kumar
  { employeeId: 'chethankuma', employeeName: 'Chethan Kumar', skillId: 1, experienceMonths: 30, certified: false },
  { employeeId: 'chethankuma', employeeName: 'Chethan Kumar', skillId: 3, experienceMonths: 24, certified: true },
  { employeeId: 'chethankuma', employeeName: 'Chethan Kumar', skillId: 10, experienceMonths: 15, certified: false },
  { employeeId: 'chethankuma', employeeName: 'Chethan Kumar', skillId: 18, experienceMonths: 19, certified: true },

  // Varun Dixit
  { employeeId: 'varundixit', employeeName: 'Varun Dixit', skillId: 1, experienceMonths: 18, certified: false },
  { employeeId: 'varundixit', employeeName: 'Varun Dixit', skillId: 2, experienceMonths: 18, certified: false },
  { employeeId: 'varundixit', employeeName: 'Varun Dixit', skillId: 3, experienceMonths: 12, certified: true },
  { employeeId: 'varundixit', employeeName: 'Varun Dixit', skillId: 5, experienceMonths: 6, certified: false },
];

export function getSkillById(skillId) {
  return SKILL_CATALOG.find((entry) => entry.skillId === skillId) || null;
}

function normalizeSkillName(skillName) {
  return skillName.trim().toLowerCase();
}

export function getSkillByName(skillName) {
  const normalizedSkillName = normalizeSkillName(skillName);
  return SKILL_CATALOG.find(
    (entry) => normalizeSkillName(entry.skillName) === normalizedSkillName,
  ) || null;
}

export function getSkillAdoptionSnapshot(skillName, totalEmployees = 100) {
  const normalizedSkillName = normalizeSkillName(skillName);
  const submissionCount = MOCK_SUBMISSIONS.filter((entry) => {
    const skill = getSkillById(entry.skillId);
    return skill && normalizeSkillName(skill.skillName) === normalizedSkillName;
  }).length;

  const adoptionRate = totalEmployees > 0
    ? Number(((submissionCount / totalEmployees) * 100).toFixed(1))
    : 0;

  return {
    submissionCount,
    totalEmployees,
    adoptionRate,
  };
}

export function getCategoryFromAdoptionRate(adoptionRate) {
  if (adoptionRate <= 5) {
    return 'Ultra Niche';
  }

  if (adoptionRate <= 15) {
    return 'Super Niche';
  }

  if (adoptionRate <= 30) {
    return 'Niche Skill';
  }

  return 'Generic Skill';
}
