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
- **Single-page flow** — no separate post-submit page. After Submit the form stays put, `state.rows` clears, the saved list refreshes, and a green success banner shows
- **Previously submitted skills** shown as a list below the form (loaded on init into `state.savedRows`)
  - **Inline edit (✏), immediate-save** — editing a saved row swaps it for a pre-filled input row; Save POSTs that single skill straight away (`saveSavedRowEdit`), then silently reloads the list. No delete yet (backend merges, server-side removal needs a delete endpoint)
- The manager **view toggle** lives in the global header, not in this block

### `report-table` — `/employee-details`
- Manager-facing report with **two tables**
- **Gated to managers** — `getSessionUser()` + `isManager`; non-managers redirected to `/`
- **Direct-reports filter** — only the logged-in manager's reports (`Manager LDAP === me`), joined via `employee-mapping.js`. Skipped in test/local, where a built-in `DUMMY_SKILL_REPORT` (10 employees across all tiers) backs the view
- Live data via `getSkillReport()`; level badges driven by `proficiencyLevels` from API metadata
- **Table 1 — "Skills by rarity tier"** (`renderTierTable`): one column group per tier (Generic → Ultra niche), split into Skill + Months. One row per employee with the employee's skills zipped row-by-row across tiers (side-by-side, not stacked); employee name spans their rows; dark rule between employees. Rose-gradient tier theming, single-letter proficiency badges. **Export CSV** (`tierTableToCsv`) mirrors this layout 1:1
- **Table 2 — "Skill Distribution"** (`renderDistributionTable`): rows = rarity tiers, columns = P-level bands (P20–P50), cells = employee counts, with a **Noida / Bangalore location filter** (pill buttons swap cell values in place). Columns (`levels`) and locations (`locations`) are **authorable** via block config rows. Backed by `DUMMY_DISTRIBUTION` for now — to be replaced with a fetch from `/skill-distribution-mapping.json`
- Sticky employee column, loading/error/empty states
- **View toggle** lives in the global header (not in-block); no logout in-block (global header Logout only)

---

## Scripts

| File | Purpose |
|---|---|
| `scripts/api.js` | `getSkillReport()`, `getEmployeeSkillReport(id)`, `submitSkillReport()`, `buildSkillsPayload()` (specialization → comma string), async `getLevelFromExperienceMonths()` |
| `scripts/auth.js` | SSO wired: `initAuth`/`loadIms`, `logout()` (default), `getSessionUser()` (+ `?as=` test impersonation), `isTestEnvironment()`. Derives `isManager` from the mapping sheet |
| `scripts/employee-mapping.js` | Loads/caches `/employee-mapping.json`; `normalizeLdap`, `getEmployeeMapping`, `isManager`, `getDirectReports`, `buildUserFromMapping` |
| `scripts/view-toggle.js` | `buildViewToggle(currentView)` — segmented "Enter Skills ⇄ Manager View" control; preserves `?as=` on navigation. Rendered by the **global header** (`blocks/header`) for managers, not by the page blocks |
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
| `skill-distribution-mapping` | Spreadsheet | **Planned** — per-employee P-level + location feeding the Skill Distribution table (currently `DUMMY_DISTRIBUTION` in `report-table.js`) |

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
| Real Skill Distribution data | Table 2 uses `DUMMY_DISTRIBUTION` (Noida/Bangalore). Awaiting manager's P-level + location dataset → `/skill-distribution-mapping.json` |
