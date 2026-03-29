---
id: TASK-21.1
title: Align admin hackathon detail navigation and role-assignment tabs
status: Done
assignee:
  - '@codex'
created_date: '2026-03-28 23:41'
updated_date: '2026-03-28 23:53'
labels: []
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
parent_task_id: TASK-21
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the account-scoped hackathon detail surface so admins see consistent admin-dashboard selection in the shell sidebar whenever they are on a hackathon page that routes back to the admin dashboard. Move hackathon judge assignment controls into the existing Judges tab and move hackathon-admin assignment controls into the existing Staff tab so those role-management actions live on the pages that represent those rosters. Preserve the current permissions model: only platform admins and hackathon admins can manage these rosters, while non-admin viewers continue to see only the non-operational tab content.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 When a platform admin or hackathon admin is on an account-scoped hackathon detail page that links back to the admin dashboard, the shell sidebar highlights Admin dashboard rather than My hackathons
- [x] #2 The Judges tab exposes judge assignment and removal controls only for platform admins and hackathon admins, and non-admin viewers do not see admin role-management actions there
- [x] #3 The Staff tab exposes hackathon-admin assignment and removal controls only for platform admins and hackathon admins, and non-admin viewers do not see admin role-management actions there
- [x] #4 Judge and hackathon-admin assignment controls are removed from the Settings and Operations surfaces so the roster-management entry points live only on the Judges and Staff tabs
- [x] #5 Relevant unit coverage is updated for the sidebar active-state behavior and any affected role-management UI logic, and bun run test:unit is run locally
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Derive admin-access context for account-scoped hackathon detail routes from the existing `/api/account/hackathons` data so shell navigation can distinguish admin-accessible hackathon pages from participant-only pages.
2. Update shell navigation active-state logic so `/account/admin` stays selected for any admin-accessible account hackathon detail page, including non-operations tabs that still route back to the admin dashboard.
3. Extract a reusable hackathon role-roster management component and use it to render judge management in the Judges tab and hackathon-admin management in the Staff tab for admin-capable actors only.
4. Remove duplicate judge and hackathon-admin assignment controls from the Competition and Settings panels while preserving the rest of those surfaces.
5. Update unit tests for shell navigation and run `bun run test:unit`, then record validation and any gaps in the task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented the sidebar active-state fix by threading an account-hackathon navigation mode through the existing shell navigation matcher so admin-accessible account hackathon pages keep Admin dashboard selected even outside Operations and Settings.

Added a dedicated reusable role-roster panel plus lightweight role-roster workspace/helper utilities, then mounted judge management in the Judges tab and hackathon-admin management in the Staff tab for admin-capable actors only.

Removed duplicate judge/admin role-assignment entry points from the Competition and Settings panels so roster management now lives only in the dedicated tab surfaces.

Validation: `bun run test:unit` passed. `bun run typecheck` still fails, but only because of pre-existing unrelated errors in server/api/hackathons/[hackathonId]/applications/actions/apply-staged-decisions.post.ts and server/api/hackathons/[hackathonId]/applications/index.post.ts.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aligned account-scoped hackathon admin navigation and role-assignment surfaces.

What changed:
- Admin-accessible account hackathon detail pages now keep `Admin dashboard` selected in the shell sidebar across the full hackathon page surface, including non-operations tabs.
- Judge assignment and removal controls now live in the `Judges` tab.
- Hackathon-admin assignment and removal controls now live in the `Staff` tab.
- Duplicate judge/admin role-assignment controls were removed from the `Competition` and `Settings` panels.
- Added unit coverage for the updated sidebar matching behavior and the extracted role-roster helper logic.

Validation:
- `bun run test:unit` passed.
- `bun run typecheck` was run as an extra check and still fails only because of pre-existing unrelated errors in `server/api/hackathons/[hackathonId]/applications/actions/apply-staged-decisions.post.ts` and `server/api/hackathons/[hackathonId]/applications/index.post.ts`.

Docs/config:
- Canonical docs were confirmed unchanged.
- No config or workflow docs changes were required.

Risks/follow-ups:
- The role-roster tabs now provide the single roster-management entry point for admins. If the team later wants published public judge/staff lists distinct from admin assignment rosters, that should be modeled as a separate product surface rather than folded back into these admin controls.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [x] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [x] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
