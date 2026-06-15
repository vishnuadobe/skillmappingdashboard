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
- Columns: Skill, Experience in Months (mandatory), Specialization (optional multi-select), Platform (optional multi-select), Certification (Yes/No), Title of Certificate (shown when Yes)
- Skill dropdown from `/skills.json` (da.live authorable); "Other…" allows free-text custom skills
- Specialization multi-select sourced from `/specializations.json`; multiple options per skill row
- Platform multi-select sourced from `/platforms.json` (da.live authorable); lists Adobe platforms (EDS, AEM, AJO, AEP, etc.); stored as `platform` comma-string in backend, split back to array on read
- Proficiency level derived from authorable `/skill-levels.json`
- **"+ Add" submits immediately** — there is no separate Submit button. Clicking **+ Add** in the bottom input row builds a single-skill payload and POSTs it via `submitSkillReport()`, then silently reloads the saved list and shows a green success banner. The backend merges/appends, so a single-skill POST is all that's needed. Specialization and Platform both round-trip as comma-strings (joined on write, split on read)
- **Single-page flow** — the bottom "+ Add" input row is always present; after each Add it clears and is ready for the next skill
- **Previously submitted skills** shown as a list below the form (loaded on init into `state.savedRows`)
  - **Inline edit, immediate-save** — clicking ✏ on a saved row swaps it for a pre-filled input row in place, with **floppy (Save) / × (Cancel) icon buttons** on a single line. Save POSTs that single skill straight away (`submitInputSkill`), then silently reloads the list. No delete yet (backend merges, server-side removal needs a delete endpoint)
  - The saved-row edit uses its own input model (`state.editInput`) separate from the add row's (`state.input`), so the "+ Add" row stays usable while a saved row is being edited — both input rows can be active at once
- The manager **view toggle** lives in the global header, not in this block

### `report-table` — `/employee-details`
- Manager-facing report with **two tables**
- **Gated to managers** — `getSessionUser()` + `isManager`; non-managers redirected to `/`
- **Direct-reports filter** — only the logged-in manager's reports (`Manager LDAP === me`), joined via `employee-mapping.js`
- Live data via `getSkillReport()`; level badges driven by `proficiencyLevels` from API metadata
- **Shared rarity-tier helpers** — `getSkillTier(name, skillRarity)` (a skill's tier) and `groupSkillsByTier(skills, skillRarity)` (`Map<tierId, sortedSkills[]>`) are the single source of truth for tier bucketing, used by the tier table render, the CSV export, and the distribution table's tier rows (which also share the `RARITY_TIERS` definition)
- **Table 1 — "Skills by rarity tier"** (`renderTierTable`): one column group per tier (Generic → Ultra niche), split into Skill + Months. One row per employee with the employee's skills zipped row-by-row across tiers (side-by-side, not stacked); employee name spans their rows; dark rule between employees. Rose-gradient tier theming, single-letter proficiency badges. **Export CSV** (`tierTableToCsv`) mirrors this layout 1:1
- **Table 2 — "Skill Distribution"** (`renderDistributionTable`): rows = rarity tiers, columns = P-level bands (P20–P50), cells = employee counts, with a **Noida / Bangalore location filter** (pill buttons swap cell values in place). Columns (`levels`) and locations (`locations`) are **authorable** via block config rows. Distribution computed at runtime from `employee-mapping.json` (`Job Level` → `P`-prefixed, `Location`) joined with the live skill report — no separate sheet needed
- Sticky employee column, loading/error/empty states
- **View toggle** lives in the global header (not in-block); no logout in-block (global header Logout only)

---

## Scripts

| File | Purpose |
|---|---|
| `scripts/api.js` | `getSkillReport()`, `getEmployeeSkillReport(id)`, `submitSkillReport()`, `buildSkillsPayload()` (specialization + platform → comma strings), async `getLevelFromExperienceMonths()` |
| `scripts/auth.js` | SSO wired: `initAuth`/`loadIms`, `logout()` (default), `getSessionUser()` (+ `?as=` test impersonation), `isTestEnvironment()`. Derives `isManager` from the mapping sheet |
| `scripts/employee-mapping.js` | Loads/caches `/employee-mapping.json`; `normalizeLdap`, `getEmployeeMapping`, `isManager`, `getDirectReports`, `getAllEmployeeRecords` (includes `jobLevel`/`location`), `buildUserFromMapping` |
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
| `specializations` (tab: `platforms`) | Spreadsheet tab | Platform multi-select options for `entry-form` (EDS, AEM, AJO, AEP, etc.) — second tab inside the `specializations` sheet, same `name` column structure, served at `/specializations/platforms.json` |
| `employee-mapping` | Spreadsheet | Manager hierarchy + job level + location (`Emp_LDAP`, `Resource Name`, `Workday Manager`, `Manager LDAP`, `Job Level`, `Location`, `Location Code`) — drives `isManager`, direct-reports filter, and Skill Distribution P-level counts |

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
| ~~Real Skill Distribution data~~ | **Done** — computed at runtime from `employee-mapping.json` (`Job Level` + `Location`) joined with the live skill report |
