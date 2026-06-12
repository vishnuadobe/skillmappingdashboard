# Skill Mapping Dashboard — Progress Log

## Project Setup

- Added `fstab.yaml` pointing to `https://content.da.live/vishnuadobe/skillmappingdashboard/` as the content source
- Org chart block scrapped — `org-chart` removed from the active codebase
- Entry form moved to the index page (`/`) — no redirect routing on the index
- `/employee-details` is now **gated to managers** (see `report-table`); non-managers are redirected to `/`
- Added the `employee-mapping` authorable sheet (`/employee-mapping.json`): `Emp_LDAP` → `Resource Name`, `Workday Manager`, `Manager LDAP`. This is the source of truth for the manager hierarchy and the `isManager` flag

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
- **Single-page flow** — there is no separate post-submit "saved view" page. After a successful Submit the form stays in place, `state.rows` is cleared, the "Previously submitted skills" list refreshes from the server, and a green success banner ("Skills submitted successfully.") is shown
- POSTs directly to the confirmed backend endpoint via `submitSkillReport()`
- Proficiency level derived from experience months via `/skill-levels.json` (authorable)
- Specialization round-trips correctly: the backend field is `specialization` (singular, **comma-separated string**, e.g. `"PNA, SPA"`), not a `specializations` array. `buildSkillsPayload()` joins the array on write; `parseSpecializations()` splits it back on read
- **Previously submitted skills** — a list rendered below the form. Loaded on init via `loadPreviousEntries()` into `state.savedRows`, kept separate from the editable `state.rows`; specializations show as chips. Refreshed silently after each submit so it always reflects current server state
  - **Inline edit (✏) on saved rows, immediate-save (Option B)** — clicking ✏ on a previously-submitted skill (`editSavedRow`) swaps that row for a pre-filled input row in place. Clicking **Save** (`saveSavedRowEdit`) validates, builds a single-skill payload, POSTs it immediately, then silently reloads the saved list and shows a success banner. The bottom form input row is hidden while a saved-row edit is active; `state.editingSavedIndex` and `state.editingIndex` are mutually exclusive, and Submit is disabled while a saved-row edit is in flight
  - **No delete** on saved rows yet — backend merges only, so server-side removal needs a DELETE endpoint
- Resolves the user via `getSessionUser()` (so `?as=<ldap>` impersonation works here too). The **view toggle** for managers now lives in the global header, not in this block
- `email` and `name` in the POST payload are populated from the IndexDB user record (SSO wired)

### `report-table` — `/employee-details`
**Status: Complete (live API, manager-gated) — two tables**

- Fetches real skill data via `getSkillReport()` in production; in test/local environments (`isTestEnvironment()`) it uses a built-in `DUMMY_SKILL_REPORT` (10 employees engineered to populate all four rarity tiers) so the view is always populated
- **Access gate** — resolves the session user, then `allowed = user ? user.isManager : isTestEnvironment()`. A non-manager (or, in production, an unidentified user) is redirected to `/` before any data is fetched
- **Direct-reports filter** — employees filtered to those whose `Manager LDAP` equals the logged-in manager's LDAP (one level only), joined on the normalized LDAP local-part. Skipped entirely in test environments (the dummy employees won't match any real direct-report LDAP, so the full dummy list is shown)
- **Skill rarity tiers** (Generic / Niche / Super niche / Ultra niche) — computed from how many employees across the **whole workforce** hold each skill (`computeSkillRarity` + `getRarityTier`). Thresholds in the `RARITY_TIERS` constant: Generic ≥50%, Niche ≥30%, Super niche ≥20%, Ultra niche ≥10%
- Proficiency level badges (Foundational → Master) driven by API metadata; legend shown in the toolbar. Inside the tier table a single-letter badge (F/D/P/E/M via `getLevelInitial`) sits next to each skill name
- **View toggle** — moved out of this block into the global header (`blocks/header`); shown there for managers on both pages
- Loading, error, and empty ("No direct reports have submitted skills yet.") states handled
- No logout button in this block — the global Adobe header Logout is the only one

#### Table 1 — "Skills by rarity tier" (`renderTierTable`)
- One column **group per rarity tier** (Generic → Ultra niche), each split into **Skill** and **Months** sub-columns. Two-row `thead`: rose-gradient banner row (`colspan=2` per tier) + a Skill/Months sub-header row
- Body: **one row per employee**, with that employee's skills **zipped row-by-row across tiers** so each tier's first skill aligns side-by-side on the employee's first row, second skills on the next row, etc. (skills are grouped by tier, sorted alphabetically within a tier). The employee name cell spans all of the employee's rows (`rowSpan`)
- A **dark horizontal rule** (`#c4cdd9`, via `.report-table__row--emp-start`) separates each employee (skipped on the first)
- **Rose tier theming** — `--tier-accent` CSS variable per tier ramping light (common) → deep (rare); banners use rose gradients, frame borders (lead/trail cells) pick up the accent. Kept distinct from the multicolour proficiency badges
- Sticky employee column (`.report-table__col-employee` / `.report-table__cell-employee`)
- **Export CSV** (`tierTableToCsv`) — mirrors the on-screen layout 1:1: a two-row header (tier group row with the label under the first of each tier's two columns + a Skill/Months sub-row), then one row per skill with the employee name only on their first row (rowspan emulation) and each skill placed under its matching tier column

#### Table 2 — "Skill Distribution" (`renderDistributionTable`)
- Rows = rarity tiers (Generic → Ultra niche); columns = **P-level bands** (P20/P30/P40/P50), cells = employee counts. Two-row `thead`: "By" + "Skill Distribution" (`colspan`) banner, then "Role" + one `th` per level
- **Location filter** — pill buttons (Noida / Bangalore) above the table; clicking one swaps all cell values in-place (no DOM rebuild). The same tier rows are shown per location (the requirement was to show Generic/Niche/etc twice, once per location)
- **Authorable** via two optional block config rows in the da.live `employee-details` document: `levels` (comma list, default `P20,P30,P40,P50`) and `locations` (comma list, default `Noida,Bangalore`)
- Currently backed by a `DUMMY_DISTRIBUTION` map keyed `location → tier → level → count`. **To be replaced** with a fetch from `/skill-distribution-mapping.json` (da.live sheet) once the manager provides the data — the dataset will carry each employee's P-level + location

---

## Scripts

### `scripts/api.js`
- `API_BASE_URL` — base constant; `SKILL_REPORT_URL` derived from it
- `getSkillReport()` — GET all employees from `SKILL_REPORT_URL`
- `getEmployeeSkillReport(employeeId)` — GET `skillReport/employee/{employeeId}`; used by entry-form saved view + previous-entries list
- `submitSkillReport(payload)` — POST to `SKILL_REPORT_URL`
- `buildSkillsPayload(employeeId, email, name, skills)` — constructs POST body matching confirmed schema; `specialization` joined to a comma-separated string when present; cert `certificateImageUrl` only included when present
- `getLevelFromExperienceMonths(months)` — async, fetches thresholds from `/skill-levels.json`, caches result
- `requestJson()` attaches a `Bearer` token from `window.adobeIMS.getAccessToken()` when available

### `scripts/employee-mapping.js`
- Loads and caches `/employee-mapping.json` (the authorable manager-hierarchy sheet)
- `normalizeLdap(value)` — reduces an LDAP/email to its lowercase local-part so the skill-report API (`employeeId`/`email`) and the sheet (`Emp_LDAP`/`Manager LDAP`) join on one key
- `getEmployeeMapping(ldap)` — a person's record (name, manager, manager LDAP)
- `isManager(ldap)` — true iff the LDAP appears as a `Manager LDAP` for ≥1 employee
- `getDirectReports(ldap)` — rows where `Manager LDAP === ldap` (one level)
- `buildUserFromMapping(ldap)` — builds an IndexDB-shaped user from the sheet (used by `?as=` impersonation)

### `scripts/auth.js`
- Adobe IMS SSO is **wired**: `loadIms()` loads `imslib.min.js`, `window.adobeid` config, `onReady` → fetches profile → `setUser({ name, email, ldap, isManager })`
- `isManager` is **derived from the mapping sheet** on login (falls back to `false` if the sheet can't be read)
- `logout()` (default export) — `clearUser()` then `signOut()` (or redirect to `/`)
- `isTestEnvironment()` — true on localhost / `.aem.page` preview
- `getSessionUser()` — returns the IndexDB user; in test environments an `?as=<ldap>` query param impersonates that employee (via `buildUserFromMapping`). Ignored on production. Used by `report-table` (gating + filtering) and `entry-form` (manager check + toggle)

### `scripts/view-toggle.js`
- `buildViewToggle(currentView)` (default export) — builds the segmented "Enter Skills" (`/`) ⇄ "Manager View" (`/employee-details`) control. Links carry the current query string so `?as=<ldap>` survives navigation. Styles live in `styles/lazy-styles.css` (`.view-toggle`, scoped to beat the global `a:any-link` colour)
- **Now rendered by the global header**, not by the page blocks — `blocks/header/header.js` calls `getSessionUser()` and, for a manager, prepends the toggle into `.header__actions` (next to Logout), detecting the current view from `window.location.pathname`. `.header > nav` (not `.header nav`) is used so the selector doesn't also match the toggle's own nested `nav`

### `blocks/header`
- Global Adobe header: brand/logo, actions area (view toggle for managers + Logout)
- Imports `logout`, `getSessionUser` from `auth.js` and `buildViewToggle` from `view-toggle.js`

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

### `/employee-mapping.json`
`employee-mapping` da.live spreadsheet — the manager hierarchy. Read by `scripts/employee-mapping.js` to derive `isManager` and the direct-reports filter. ~86 rows.

| Emp_LDAP | Resource Name | Workday Manager | Manager LDAP |
|---|---|---|---|
| robinvarshn@adobe.com | robin varshney . | Bansal, Atul | atulb@adobe.com |
| … | … | … | … |

> Filtering joins the sheet's `Emp_LDAP`/`Manager LDAP` with the skill API's `employeeId`/`email` on the normalized LDAP local-part — they must spell the LDAP identically. Known test rows (`nehalv`, `vdivyeshan`, `kmomin`) were added under `atulb` for testing. Note: the sheet's `chethankuma` vs the backend's `chethankumar` won't join until one side is corrected.

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
          "certification": { "certificateName": "TypeScript Advanced", "certificateImageUrl": "https://..." }
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

> Note: Both GET employee and POST use `certificateName` / `certificateImageUrl`. `mapServerSkillToRow()` in entry-form.js still also accepts the legacy `name` / `imageUrl` shape for backward compatibility.

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
      "certification": { "certificateName": "TypeScript Advanced", "certificateImageUrl": "https://..." }
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
| ~~SSO login (Adobe IMS)~~ | **Done** — `auth.js` `loadIms()` wires `imslib.min.js`, `onReady` → `getProfile()` → `setUser()` |
| ~~IndexDB write after login~~ | **Done** — `setUser({ name, email, ldap, isManager })` called from IMS `onReady` |
| ~~`isManager` check~~ | **Done** — derived from `/employee-mapping.json` via `isManager()` in `employee-mapping.js` |
| Replace mock skill catalog | `skill-data.js` still imported by some paths — `report-table` and `entry-form` use live API |
| Auth headers on API calls | `requestJson()` sends a bearer token when `window.adobeIMS` is present; confirm backend requirement |
| Data reconciliation | LDAP spellings must match between the mapping sheet and the skill backend (e.g. `chethankuma` vs `chethankumar`) or the employee won't surface |
| Server-side skill deletion | Backend merges only; need a `DELETE skillReport/employee/{employeeId}/skill/{skillName}` endpoint (or replace semantics on POST) |
| Real Skill Distribution data | `report-table` Table 2 is backed by `DUMMY_DISTRIBUTION` (location → tier → P-level → count). Awaiting the manager's per-employee P-level + location dataset, to be authored as `/skill-distribution-mapping.json` and fetched in place of the dummy map |
