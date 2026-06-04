# Skill Mapping Dashboard — Progress Log

## Project Setup

- Added `fstab.yaml` pointing to `https://content.da.live/vishnuadobe/skillmappingdashboard/` as the content source
- Org chart block scrapped — `org-chart` removed from the active codebase
- Entry form moved to the index page (`/`) — no redirect routing on the index
- `/employee-details` remains accessible directly but is not in the main user flow

---

## Blocks

### `entry-form` — `/` (index)
**Status: Complete (live POST)**

- Table-based UI: columns — Skill, Experience in Months, Specialization, Certification, Title of Certificate
- Skill dropdown fetched dynamically from `/skills.json` (da.live authorable)
  - "Other…" option reveals free-text input for custom skills not in the list
- Experience: free-text number input (1–1000 months); mandatory field
- Specialization: custom multi-select dropdown, options fetched from `/specializations.json` (da.live `specializations` sheet, authorable); optional field — multiple values can be selected; selected values shown as indigo chips in data rows
- Certification: simple Yes / No dropdown; Title of Certificate text input shown only when Yes
- Inline Edit (✏) and Delete (×) per added row; editing row highlighted in amber
- Add button commits row to table; Save button replaces row when editing
- Form → Success flow (submit directly, no preview step)
- POSTs directly to the confirmed backend endpoint via `submitSkillReport()`
- Proficiency level derived from experience months via `/skill-levels.json` (authorable)
- `specializations` array included in POST payload per skill entry when selections are present
- `email` and `name` in POST payload currently empty strings — will be populated from IndexDB once SSO is wired
- 40px top padding added to card so it clears the site header
- Removed dependency on `skill-data.js` (mock catalog no longer used in form)

### `report-table` — `/employee-details`
**Status: Complete (live API)**

- Fetches real skill data from the confirmed backend endpoint via `getSkillReport()`
- Skill matrix: rows = employees, columns = skills
- Proficiency level badges (Foundational → Master) driven by API metadata
- Sticky employee name column
- Export CSV button
- Loading and error states handled
- Logout button in header — calls `logout()` from `auth.js`

---

## Scripts

### `scripts/api.js`
- `getSkillReport()` — GET from confirmed backend URL
- `submitSkillReport(payload)` — POST to same backend URL
- `buildSkillsPayload(employeeId, email, name, skills)` — constructs POST body matching confirmed schema
- `getLevelFromExperienceMonths(months)` — async, fetches thresholds from `/skill-levels.json`, caches result
- Unused `API_VERSION` constant removed; `requestJson` moved above its first usage (lint fixes)

### `scripts/auth.js`
- `logout()` (default export) — calls `clearUser()`, redirects to `/`
- `initAuth()` removed — no redirect routing needed now that entry form is on the index page
- Adobe IMS SSO stub to be added here: `loadIms()` using `imslib.min.js` from CDN, `window.adobeid` config with client ID

### `scripts/db.js`
- `setUser(user)` — writes `{ name, email, ldap, isManager }` to IndexDB
- `getUser()` — reads the record, returns `null` if not set
- `clearUser()` — deletes the record

### `scripts/scripts.js`
- `initAuth()` call on index page removed — no routing logic needed
- Entry point calls `loadPage()` directly

### `scripts/skill-data.js`
- Mock data: `SKILL_CATALOG`, `MANAGERS`, `MOCK_SUBMISSIONS`
- Still used by `entry-form` for skill category lookups — to be replaced with live API once SSO provides user context

---

## Authorable Data (da.live)

### `/skill-levels.json`
Spreadsheet in da.live controlling the experience → proficiency level mapping. Authors update thresholds without any code change.

| level | label | max-months |
|---|---|---|
| 1 | Foundational | 5 |
| 2 | Developing | 10 |
| 3 | Professional | 15 |
| 4 | Expert | 20 |
| 5 | Master | 999 |

### `/skills.json`
Separate `skills` da.live spreadsheet. Controls the skill dropdown in `entry-form`. Authors add or remove skills without any code change.

| name |
|---|
| HTML |
| CSS |
| JavaScript |
| React |
| … |

### `/specializations.json`
Separate `specializations` da.live spreadsheet. Controls the multi-select specialization dropdown in `entry-form`. Authors add or remove options without any code change.

| name |
|---|
| PNA |
| SPA |
| Micro frontX |
| Hybrid Mobile App |
| iOS Native App |
| Android Native App |
| AppBuils |

---

## API Reference

**Base URL (staging):**
`https://293924-uiprojectdashboard-stage.adobeio-static.net/api/v1/web/uiprojectdashboard/skillReport`

Both GET and POST use the same URL.

### GET — used by `report-table`

**Sample Response:**
```json
{
  "metadata": {
    "totalRecords": 2,
    "proficiencyLevels": [
      { "level": 1, "label": "Foundational" },
      { "level": 5, "label": "Master" }
    ]
  },
  "employees": [
    {
      "employeeId": "robinvarshn",
      "email": "robinvarshn@adobe.com",
      "name": "Robin Varshney",
      "skills": [
        { "name": "HTML5", "proficiencyLevel": 1, "expInMonths": 12 },
        {
          "name": "TypeScript", "proficiencyLevel": 3, "expInMonths": 6,
          "certification": { "name": "TypeScript Advanced", "imageUrl": "https://..." }
        }
      ]
    }
  ]
}
```

### POST — used by `entry-form`

**Payload shape:**
```json
{
  "employeeId": "robinvarshn",
  "email": "robinvarshn@adobe.com",
  "name": "Robin Varshney",
  "skills": [
    { "name": "HTML5", "expInMonths": 12, "proficiencyLevel": 1 },
    {
      "name": "TypeScript", "expInMonths": 24, "proficiencyLevel": 3,
      "certification": { "name": "TypeScript Advanced", "imageUrl": "https://..." }
    }
  ]
}
```

> `email` and `name` will be populated from IndexDB once SSO is wired up.

---

## What Is Not Built Yet

| Feature | Notes |
|---|---|
| SSO login (Adobe IMS) | Client ID in hand. Pattern confirmed: `imslib.min.js` from CDN, `window.adobeid` config, `onReady` → `isSignedInUser()` check. Wiring deferred to next session. |
| IndexDB write after login | `setUser()` ready in `db.js` — to be called from IMS `onReady` after fetching profile |
| Replace mock skill catalog | `skill-data.js` still used by `report-table` — entry-form no longer depends on it |
| Auth headers on API calls | Pending confirmation — do GET/POST need a bearer token from SSO? |
| `isManager` check | Need to define source of truth — IMS profile field or backend call |
