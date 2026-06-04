# Skill Mapping Dashboard — Project Overview

## What This Is

An internal Adobe tool for mapping and tracking frontend skill proficiency across teams. Built on AEM Edge Delivery Services (EDS) using vanilla JS, no frameworks or build steps.

---

## Pages

| URL | Block | Audience |
|---|---|---|
| `/` | `entry-form` | Employees |
| `/employee-details` | `report-table` | Managers (not in active routing flow — accessed directly) |

---

## User Flow

```
Open app (index — entry form lives here)
│
├── SSO login via Adobe IMS (not wired yet — waiting on credentials)
│   └── return profile → setUser() in db.js
│
├── Fill form → POST skill report → Backend API
│   └── Success → fetch GET employee/{id} → Saved view
│       ├── Edit any saved skill → Save changes → re-POST
│       └── + Add more skills → back to blank form
│
Logout (either page) → clearUser() → redirect to /
```

---

## API

**Base URL (staging):**
`https://293924-uiprojectdashboard-stage.adobeio-static.net/api/v1/web/uiprojectdashboard/skillReport`

Defined in `scripts/api.js`.

| Method | Endpoint | Function | Used by |
|---|---|---|---|
| GET | `/skillReport` | `getSkillReport()` | `report-table` block |
| GET | `/skillReport/employee/{employeeId}` | `getEmployeeSkillReport(employeeId)` | `entry-form` saved view |
| POST | `/skillReport` | `submitSkillReport(payload)` | `entry-form` block |

> Backend **merges/appends** on POST — does not replace the full skill set.

---

## Blocks

### `entry-form` — `/` (index)

**Form mode** (initial state):
- Employee submits skills via an inline table UI
- Columns: Skill, Experience in Months (mandatory), Specialization (optional multi-select), Certification (Yes/No), Title of Certificate (shown when Yes)
- Skill dropdown from `/skills.json` (da.live authorable); "Other…" allows free-text custom skills
- Specialization multi-select sourced from `/specializations.json`; multiple options per skill row
- Inline edit (✏) and delete (×) per row before submission
- Duplicate detection: case-insensitive + version-normalised (`HTML` and `HTML5` are treated as the same skill); also checks against already-saved skills
- Proficiency level derived from authorable `/skill-levels.json`
- POSTs directly to backend via `submitSkillReport()`; `specializations` array included per skill entry when present

**Saved view** (post-submit):
- Fetches employee record via `getEmployeeSkillReport(employeeId)` and displays all saved skills
- Green success banner; subtext guides the user
- Edit (✏) only — no delete button (backend merges, server-side removal needs a delete endpoint)
- Edit button is larger than in form mode (34×34 px)
- **Save changes** — re-POSTs the current table; does not re-fetch from server (preserves local edits)
- **+ Add more skills** — resets to blank form mode; saved skill names retained for duplicate checking

### `report-table` — `/employee-details`
- Manager-facing skill matrix (rows = employees, columns = skills)
- Live data via `getSkillReport()`
- Level badges driven by `proficiencyLevels` from API response metadata
- Sticky employee column, Export CSV
- Loading and error states handled
- Logout button → `logout()` in `auth.js`

---

## Scripts

| File | Purpose |
|---|---|
| `scripts/api.js` | `getSkillReport()`, `getEmployeeSkillReport(id)`, `submitSkillReport()`, `buildSkillsPayload()`, async `getLevelFromExperienceMonths()` |
| `scripts/auth.js` | `logout()` (default export) — clears IndexDB and redirects to `/`. SSO stub to be added. |
| `scripts/db.js` | IndexDB — `setUser`, `getUser`, `clearUser` for `{ name, email, ldap, isManager }` |
| `scripts/skill-data.js` | Mock data — still used by `report-table`; to be replaced once SSO provides user context |
| `scripts/scripts.js` | AEM page decoration entry point — no auth routing on index |

---

## Authorable Data (da.live)

Content at [da.live/#/vishnuadobe/skillmappingdashboard](https://da.live/#/vishnuadobe/skillmappingdashboard).

| Document/Sheet | Type | Purpose |
|---|---|---|
| `index` | Document | Entry form page (entry-form block) |
| `employee-details` | Document | Manager view page |
| `skill-levels` | Spreadsheet | Experience → proficiency level thresholds (`data` tab) |
| `skills` | Spreadsheet | Skill dropdown list for `entry-form` |
| `specializations` | Spreadsheet | Specialization multi-select options for `entry-form` (PNA, SPA, Micro frontX, Hybrid Mobile App, iOS Native App, Android Native App, AppBuils) |

---

## What Is Not Built Yet

| Feature | Notes |
|---|---|
| SSO login (Adobe IMS) | Client ID in hand — using `@identity/imsLib` (imslib.min.js from CDN). Wiring deferred. |
| IndexDB write after login | `setUser()` ready in `db.js`, needs to be called from `auth.js` after IMS `onReady` |
| Replace mock skill catalog | `skill-data.js` still used by `report-table` — entry-form now uses da.live `skills` sheet |
| Auth headers on API calls | Pending — do GET/POST need a bearer token from SSO? |
| `isManager` check | Source of truth undecided (IMS profile field vs. backend call) |
| Server-side skill deletion | Backend merges only; need a delete endpoint or replace semantics on POST |
