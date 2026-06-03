const SKILL_REPORT_URL = 'https://293924-uiprojectdashboard-stage.adobeio-static.net/api/v1/web/uiprojectdashboard/skillReport';

let levelsCache = null;

function ensureOk(response) {
  if (response.ok) {
    return response;
  }

  const error = new Error(`API request failed with status ${response.status}`);
  error.status = response.status;
  throw error;
}

async function requestJson(path, options = {}) {
  const token = window.adobeIMS?.getAccessToken()?.token;
  const response = await fetch(path, {
    headers: {
      Accept: 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  });

  ensureOk(response);
  return response.json();
}

async function fetchExperienceLevels() {
  if (levelsCache) return levelsCache;
  const { data } = await requestJson('/skill-levels.json');
  levelsCache = data.map((row) => ({
    maxMonths: Number(row['max-months']),
    level: Number(row.level),
    label: row.label,
  }));
  return levelsCache;
}

export async function getLevelFromExperienceMonths(months) {
  const normalizedMonths = Number(months);
  if (!Number.isFinite(normalizedMonths) || normalizedMonths < 1) return null;
  const levels = await fetchExperienceLevels();
  return levels.find((entry) => normalizedMonths <= entry.maxMonths) || null;
}

export function buildSkillsPayload(employeeId, email, name, skillEntries) {
  return {
    employeeId,
    email,
    name,
    skills: skillEntries.map((entry) => {
      const skill = {
        name: entry.name,
        expInMonths: entry.expInMonths,
        proficiencyLevel: entry.proficiencyLevel,
      };
      if (entry.certification) {
        skill.certification = {
          name: entry.certification.name,
          imageUrl: entry.certification.imageUrl,
        };
      }
      return skill;
    }),
  };
}

export async function getSkillReport() {
  return requestJson(SKILL_REPORT_URL);
}

export async function submitSkillReport(payload) {
  return requestJson(SKILL_REPORT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
