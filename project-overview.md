# Skill Mapping Dashboard — Project Overview

## What This Is

An internal Adobe tool for mapping and tracking frontend skill proficiency across teams. Built on AEM Edge Delivery Services (EDS) using vanilla JS, no frameworks or build steps.

---

## Pages

| URL | Block | Audience |
|---|---|---|
| `/` | `entry-form` | Employees |
| `/employee-details` | `report-table` | Managers (accessed directly by URL; **gated to managers**, non-managers redirected to `/`) |

---

## User Flow

```
Open app (index — entry form lives here)
│
├── SSO login via Adobe IMS (wired in auth.js)
│   └── return profile → setUser({ name, email, ldap, isManager }) in db.js
│       └── isManager derived from /employee-mapping.json
│
├── Fill form → POST skill report → Backend API
│   └── Success → fetch GET employee/{id} → Saved view
│       ├── Edit any saved skill → Save changes → re-POST
│       └── + Add more skills → back to blank form
│
├── Managers also see a view toggle (Enter Skills ⇄ Manager View)
│   └── Manager View (/employee-details) → direct-reports skill report
│       (non-managers are redirected back to /)
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
- POSTs directly to backend via `submitSkillReport()`; specialization round-trips as the backend's `specialization` comma-string (joined on write, split on read)
- **Previously submitted skills** shown as a read-only list below the form (loaded on init into `state.savedRows`)
- For managers, a **view toggle** ("Enter Skills ⇄ Manager View") appears at the top; regular employees don't see it

**Saved view** (post-submit):
- Fetches employee record via `getEmployeeSkillReport(employeeId)` and displays all saved skills
- Green success banner; subtext guides the user
- Edit (✏) only — no delete button (backend merges, server-side removal needs a delete endpoint)
- Clicking edit reveals an inline input row pre-filled with the skill's values (hidden otherwise in saved view); the edited row's own name is excluded from duplicate checking
- Edit button is larger than in form mode (34×34 px)
- **Save changes** — re-POSTs the current table; does not re-fetch from server (preserves local edits)
- **+ Add more skills** — resets to blank form mode; saved skill names retained for duplicate checking

### `report-table` — `/employee-details`
- Manager-facing skill matrix (rows = employees, columns = skills)
- **Gated to managers** — `getSessionUser()` + `isManager`; non-managers redirected to `/`
- **Direct-reports filter** — only the logged-in manager's reports (`Manager LDAP === me`), joined via `employee-mapping.js`
- Live data via `getSkillReport()`
- Level badges driven by `proficiencyLevels` from API response metadata
- Skills grouped under **rarity-tier banners** (Generic → Ultra niche), computed from org-wide holder counts — see `progress.md` / `RARITY_TIERS`
- Light, uniform grid lines (`--report-table-grid`); skill columns centred under their banner
- **View toggle** — "Enter Skills ⇄ Manager View" so a manager can switch to the entry form
- Sticky employee column, Export CSV
- Loading, error, and empty states handled
- No logout in-block (global header Logout only)

---

## Scripts

| File | Purpose |
|---|---|
| `scripts/api.js` | `getSkillReport()`, `getEmployeeSkillReport(id)`, `submitSkillReport()`, `buildSkillsPayload()` (specialization → comma string), async `getLevelFromExperienceMonths()` |
| `scripts/auth.js` | SSO wired: `initAuth`/`loadIms`, `logout()` (default), `getSessionUser()` (+ `?as=` test impersonation), `isTestEnvironment()`. Derives `isManager` from the mapping sheet |
| `scripts/employee-mapping.js` | Loads/caches `/employee-mapping.json`; `normalizeLdap`, `getEmployeeMapping`, `isManager`, `getDirectReports`, `buildUserFromMapping` |
| `scripts/view-toggle.js` | `buildViewToggle(currentView)` — segmented "Enter Skills ⇄ Manager View" control shown to managers on both pages; preserves `?as=` on navigation |
| `scripts/db.js` | IndexDB — `setUser`, `getUser`, `clearUser` for `{ name, email, ldap, isManager }` |
| `scripts/skill-data.js` | Mock data — legacy; blocks use the live API |
| `scripts/scripts.js` | AEM page decoration entry point; production runs `initAuth(loadPage)`, local/preview skips auth |

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
| `employee-mapping` | Spreadsheet | Manager hierarchy (`Emp_LDAP`, `Resource Name`, `Workday Manager`, `Manager LDAP`) — drives `isManager` and the direct-reports filter |

---

## What Is Not Built Yet

| Feature | Notes |
|---|---|
| ~~SSO login (Adobe IMS)~~ | **Done** — wired in `auth.js` (`loadIms`, profile → `setUser`) |
| ~~IndexDB write after login~~ | **Done** — `setUser()` called from IMS `onReady` |
| ~~`isManager` check~~ | **Done** — derived from `/employee-mapping.json` |
| Replace mock skill catalog | `skill-data.js` legacy; blocks use live API |
| Auth headers on API calls | `requestJson()` sends a bearer token when IMS present; confirm backend requirement |
| Data reconciliation | LDAP spellings must match between mapping sheet and skill backend (e.g. `chethankuma` vs `chethankumar`) |
| Server-side skill deletion | Backend merges only; need a delete endpoint or replace semantics on POST |
