# Skill Mapping Dashboard — Progress Log

## Project Setup

- Added `fstab.yaml` pointing to `https://content.da.live/vishnuadobe/skillmappingdashboard/` as the content source
- Org chart block scrapped — `org-chart` removed from the active codebase
- Entry form moved to the index page (`/`) — no redirect routing on the index
- `/employee-details` remains accessible directly but is not in the main user flow

---

## Blocks

### `entry-form` — `/` (index)
**Status: Complete (live POST + saved view)**

- Table-based UI: columns — Skill, Experience in Months, Specialization, Certification, Title of Certificate
- Skill dropdown fetched dynamically from `/skills.json` (da.live authorable)
  - "Other…" option reveals free-text input for custom skills not in the list
- Experience: free-text number input (1–1000 months); mandatory field
- Specialization: custom multi-select dropdown, options fetched from `/specializations.json` (da.live `specializations` sheet, authorable); optional field — multiple values can be selected; selected values shown as indigo chips in data rows
- Certification: simple Yes / No dropdown; Title of Certificate text input shown only when Yes
- Inline Edit (✏) and Delete (×) per added row in form mode; editing row highlighted in amber
- Add button commits row to table; Save button replaces row when editing
- Duplicate skill detection: case-insensitive and version-normalised — `HTML` and `HTML5` are treated as the same skill (trailing version numbers stripped before comparison); also checks against already-saved skills when adding more
- Form → Submit → **Saved view** flow (no intermediate preview step)
- POSTs directly to the confirmed backend endpoint via `submitSkillReport()`
- Proficiency level derived from experience months via `/skill-levels.json` (authorable)
- `specializations` array included in POST payload per skill entry when selections are present
- `email` and `name` in POST payload currently empty strings — will be populated from IndexDB once SSO is wired

#### Saved view (post-submit)
- After a successful submit, fetches the employee's full record via `GET skillReport/employee/{employeeId}` and switches to a saved view
- Displays a green success banner ("Skills submitted successfully.")
- Shows all saved skills as an editable table — edit (✏) only; delete is not shown (backend merges, so server-side removal requires a delete endpoint)
- Edit button is visually larger (34×34 px) than in the form view
- **Save changes** button re-POSTs the edited table; does not re-fetch from server after saving so local edits (including deletions from the in-memory table) are preserved
- **+ Add more skills** button resets to a blank form while retaining the saved skill name list for duplicate checking

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
- `API_BASE_URL` — base constant; `SKILL_REPORT_URL` derived from it
- `getSkillReport()` — GET all employees from `SKILL_REPORT_URL`
- `getEmployeeSkillReport(employeeId)` — GET `skillReport/employee/{employeeId}`; used by entry-form saved view
- `submitSkillReport(payload)` — POST to `SKILL_REPORT_URL`
- `buildSkillsPayload(employeeId, email, name, skills)` — constructs POST body matching confirmed schema; cert `imageUrl` only included when present
- `getLevelFromExperienceMonths(months)` — async, fetches thresholds from `/skill-levels.json`, caches result

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
- Still used by `report-table` — to be replaced with live API once SSO provides user context

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

### GET all — used by `report-table`

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

### GET employee — used by `entry-form` saved view

**URL:** `skillReport/employee/{employeeId}`

**Sample Response:**
```json
{
  "data": {
    "email": "robinvarshn@adobe.com",
    "employeeId": "robinvarshn",
    "name": "Robin Varshney",
    "skills": [
      { "expInMonths": 12, "name": "HTML5", "proficiencyLevel": 1 },
      {
        "certification": {
          "certificateImageUrl": "https://example.com/cert.png",
          "certificateName": "TypeScript Advanced"
        },
        "expInMonths": 24,
        "name": "TypeScript",
        "proficiencyLevel": 5
      }
    ]
  },
  "metadata": {
    "proficiencyLevels": [
      { "label": "Foundational", "level": 1 },
      { "label": "Developing", "level": 2 },
      { "label": "Professional", "level": 3 },
      { "label": "Expert", "level": 4 },
      { "label": "Master", "level": 5 }
    ]
  }
}
```

> Note: GET employee uses `certificateName` / `certificateImageUrl`; POST uses `name` / `imageUrl`. `mapServerSkillToRow()` in entry-form.js handles the mapping.

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

> Backend **merges/appends** — POST does not replace the full skill set. Deleting a skill from the saved view removes it from the UI but not from the server. A delete endpoint is needed for true server-side removal.

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
| Server-side skill deletion | Backend merges only; need a `DELETE skillReport/employee/{employeeId}/skill/{skillName}` endpoint (or replace semantics on POST) |
