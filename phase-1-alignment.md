# Phase 1 Alignment

This repo is pivoting to the new Skill Navigator Phase 1 scope from `new-skillnav.md`.

## Phase 1 Target

In scope:

- `blocks/login/` for LDAP entry or auth guard
- `blocks/entry-form/` for employee self-submission
- `blocks/report-table/` for manager read-only reporting
- `scripts/api.js` for shared GET and POST utilities

Out of scope for Phase 1:

- org chart navigation
- manager editing employee skills
- employee detail drill-down as the primary workflow

## Current Repo Status

Reusable:

- [scripts/api.js](C:/Users/vdivyeshan/Documents/GitHub/skillmappingdashboard/scripts/api.js) now matches the new spec direction for shared API helpers.
- [scripts/scripts.js](C:/Users/vdivyeshan/Documents/GitHub/skillmappingdashboard/scripts/scripts.js) and the global styles remain valid EDS boilerplate infrastructure.

Needs replacement or heavy refactor:

- [blocks/skill-profile/skill-profile.js](C:/Users/vdivyeshan/Documents/GitHub/skillmappingdashboard/blocks/skill-profile/skill-profile.js) is built around an employee profile detail view with manager-side editing. That conflicts with the new Phase 1 scope.
- [blocks/skill-profile/skill-profile.css](C:/Users/vdivyeshan/Documents/GitHub/skillmappingdashboard/blocks/skill-profile/skill-profile.css) is tightly coupled to the current detail-card layout, segmented editing control, and category sections.

Already moving out:

- `blocks/org-chart/` is deleted in the current worktree and should stay out of the Phase 1 rollout unless the scope changes again.

## Recommended Next Steps

1. Build `blocks/entry-form/` around the authored fields in the new spec, including preview-before-submit.
2. Reuse the skill catalogue and proficiency mapping ideas from `skill-profile.js`, but move them into form-friendly config or data helpers instead of profile rendering code.
3. Replace `skill-profile` as the primary page experience with `report-table` for manager view.
4. Keep any employee detail page work behind a later-phase backlog item instead of extending it now.

## Useful Reuse From `skill-profile`

- Hardcoded skill catalogue data can seed the initial dropdown options.
- Proficiency concepts map cleanly to the new experience-to-level helper in `scripts/api.js`.
- Avatar, back-navigation, and edit-mode logic should not be carried into Phase 1 by default.
