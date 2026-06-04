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
└── Fill form → POST skill report → Backend API

Logout (either page) → clearUser() → redirect to /
```

---

## API

**Base URL (staging):**
`https://293924-uiprojectdashboard-stage.adobeio-static.net/api/v1/web/uiprojectdashboard/skillReport`

Both GET and POST use the same URL, defined in `scripts/api.js`.

| Method | Function | Used by |
|---|---|---|
| GET | `getSkillReport()` | `report-table` block |
| POST | `submitSkillReport(payload)` | `entry-form` block |

---

## Blocks

### `entry-form` — `/` (index)
- Employee submits their skills via an inline table UI
- Columns: Skill, Experience in Months (mandatory), Specialization (optional multi-select), Certification (Yes/No), Title of Certificate (shown when Yes)
- Skill dropdown from `/skills.json` (da.live authorable); "Other…" option allows free-text entry for custom skills
- Specialization is a custom multi-select dropdown sourced from `/specializations.json` (da.live `specializations` sheet); multiple options can be chosen per skill row
- Inline edit and delete per row before submission
- Flow: Form → Submit → Success (no intermediate preview step)
- Proficiency level derived from authorable `/skill-levels.json`
- POSTs directly to backend via `submitSkillReport()`; `specializations` array included per skill entry when present
- `email` and `name` in POST payload currently empty — populated once SSO is wired

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
| `scripts/api.js` | `getSkillReport()`, `submitSkillReport()`, `buildSkillsPayload()`, async `getLevelFromExperienceMonths()` |
| `scripts/auth.js` | `logout()` (default export) — clears IndexDB and redirects to `/`. SSO stub to be added. |
| `scripts/db.js` | IndexDB — `setUser`, `getUser`, `clearUser` for `{ name, email, ldap, isManager }` |
| `scripts/skill-data.js` | Mock data — to be replaced once SSO provides user context |
| `scripts/scripts.js` | AEM page decoration entry point — no auth routing on index (entry form is the index page) |

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
| Replace mock skill catalog | `skill-data.js` still used by `report-table` — entry-form now uses da.live `skills` sheet instead |
| Auth headers on API calls | Pending — do GET/POST need a bearer token from SSO? |
| `isManager` check | Need to define how to determine manager status post-login (IMS profile field or backend call) |
