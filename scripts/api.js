const API_VERSION = '/api/v1';

const EXPERIENCE_LEVELS = [
  { maxMonths: 5, level: 1, label: 'Foundational' },
  { maxMonths: 10, level: 2, label: 'Developing' },
  { maxMonths: 15, level: 3, label: 'Professional' },
  { maxMonths: 20, level: 4, label: 'Expert' },
  { maxMonths: Number.POSITIVE_INFINITY, level: 5, label: 'Master' },
];

function ensureOk(response) {
  if (response.ok) {
    return response;
  }

  const error = new Error(`API request failed with status ${response.status}`);
  error.status = response.status;
  throw error;
}

async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      Accept: 'application/json',
      ...options.headers,
    },
    ...options,
  });

  ensureOk(response);
  return response.json();
}

export function getLevelFromExperienceMonths(months) {
  const normalizedMonths = Number(months);

  if (!Number.isFinite(normalizedMonths) || normalizedMonths < 1) {
    return null;
  }

  return EXPERIENCE_LEVELS.find((entry) => normalizedMonths <= entry.maxMonths) || null;
}

export function buildSkillsPayload(
  employeeId,
  skillEntries,
  lastUpdated = new Date().toISOString(),
) {
  return {
    employeeId,
    lastUpdated,
    skills: skillEntries.map((entry) => ({
      skillId: entry.skillId,
      proficiencyLevel: entry.proficiencyLevel,
    })),
  };
}

export async function getEmployeeSkills(managerId) {
  return requestJson(`${API_VERSION}/managers/${encodeURIComponent(managerId)}/employees/skills`);
}

export async function submitEmployeeSkills(managerId, payload) {
  return requestJson(`${API_VERSION}/managers/${encodeURIComponent(managerId)}/employees/skills`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}
