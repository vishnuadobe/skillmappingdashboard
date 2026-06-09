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
- Form → Submit → **Saved view** flow (no intermediate preview step)
- POSTs directly to the confirmed backend endpoint via `submitSkillReport()`
- Proficiency level derived from experience months via `/skill-levels.json` (authorable)
- Specialization round-trips correctly: the backend field is `specialization` (singular, **comma-separated string**, e.g. `"PNA, SPA"`), not a `specializations` array. `buildSkillsPayload()` joins the array on write; `parseSpecializations()` splits it back on read
- **Previously submitted skills** — a read-only list rendered below the form (form mode). Loaded on init via `loadPreviousEntries()` into `state.savedRows`, kept separate from the editable `state.rows`. No input/edit/delete; specializations show as chips. Refreshed after each submit so returning via "+ Add more skills" shows the current server state
- Resolves the user via `getSessionUser()` (so `?as=<ldap>` impersonation works here too); a **view toggle** ("Enter Skills ⇄ Manager View") is shown only when `user.isManager` — regular employees never see it
- `email` and `name` in the POST payload are populated from the IndexDB user record (SSO wired)

#### Saved view (post-submit)
- After a successful submit, fetches the employee's full record via `GET skillReport/employee/{employeeId}` and switches to a saved view
- Displays a green success banner ("Skills submitted successfully.")
- Shows all saved skills as an editable table — edit (✏) only; delete is not shown (backend merges, so server-side removal requires a delete endpoint)
- Clicking edit reveals an inline input row (hidden otherwise in saved view) pre-filled with that skill's values; the row's own name is excluded from duplicate checking so it can be saved unchanged
- Edit button is visually larger (34×34 px) than in the form view
- **Save changes** button re-POSTs the edited table; does not re-fetch from server after saving so local edits (including deletions from the in-memory table) are preserved
- **+ Add more skills** button resets to a blank form while retaining the saved skill name list for duplicate checking

### `report-table` — `/employee-details`
**Status: Complete (live API, manager-gated)**

- Fetches real skill data from the confirmed backend endpoint via `getSkillReport()`
- Skill matrix: rows = employees, columns = skills
- Proficiency level badges (Foundational → Master) driven by API metadata
- Sticky employee name column
- Export CSV button (column order matches the on-screen order)
- Loading, error, and empty ("No direct reports have submitted skills yet.") states handled
- **Access gate** — resolves the session user, then `allowed = user ? user.isManager : isTestEnvironment()`. A non-manager (or, in production, an unidentified user) is redirected to `/` before any data is fetched
- **Direct-reports filter** — employees filtered to those whose `Manager LDAP` equals the logged-in manager's LDAP (one level only), joined on the normalized LDAP local-part. In local/preview with no session user, the full list is shown (dev convenience)
- **Skill rarity tiers** (Generic / Niche / Super niche / Ultra niche) — computed from how many employees across the **whole workforce** hold each skill (`computeSkillRarity`). Thresholds in the `RARITY_TIERS` constant (≥50% / 25–50% / 10–25% / <10%)
- **Grouped header** — a two-row `thead`: a rose-coloured banner row where each tier spans its skills (`colspan` groups), and a second row with the individual skill names. Per-skill holder counts shown as a `title` tooltip on each name cell. Rose intensity ramps light→deep with rarity, kept distinct from the proficiency badge palette. CSV export stays flat (per-skill columns)
- **Column ordering** — skills sorted rarest-first (lowest workforce share), alphabetical within a tier — which also keeps each tier's skills contiguous for the colspan grouping
- **Grid lines** — light, uniform horizontal + vertical lines driven by the `--report-table-grid` CSS variable (easy to retone or remove); skill columns (names + badges) centred under their banner
- **View toggle** — segmented "Enter Skills ⇄ Manager View" control prepended to the block (always, since the gate guarantees a manager), letting a manager jump back to the entry form
- No logout button in this block — the global Adobe header Logout is the only one

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
- `buildViewToggle(currentView)` (default export) — builds the segmented "Enter Skills" (`/`) ⇄ "Manager View" (`/employee-details`) control. Links carry the current query string so `?as=<ldap>` survives navigation. Caller decides whether to render it (managers only). Styles live in `styles/lazy-styles.css` (`.view-toggle`, scoped to beat the global `a:any-link` colour)

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
