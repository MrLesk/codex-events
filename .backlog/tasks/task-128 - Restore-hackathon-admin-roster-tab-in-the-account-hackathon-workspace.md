---
id: TASK-128
title: Restore hackathon admin roster tab in the account hackathon workspace
status: Done
assignee: []
created_date: '2026-03-30 21:25'
updated_date: '2026-03-30 21:30'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add back a dedicated Admins tab in the account-scoped hackathon workspace so hackathon admins and platform admins can manage hackathon admin assignments from the same internal role-roster area used for judges and staff. The tab should reuse the existing role-roster interaction pattern, appear between Operations and Settings, and remain hidden from non-admin actors.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Hackathon admins and platform admins see an Admins tab in the account hackathon workspace, and non-admin actors do not.
- [x] #2 The Admins tab appears between Operations and Settings in the workspace tab order.
- [x] #3 The Admins tab uses the internal roster-management pattern to list current hackathon admins and lets authorized actors add or remove hackathon admin assignments.
- [x] #4 Existing staff and judges roster behavior continues to work without changing their visibility rules.
- [x] #5 Automated coverage is updated for tab access/order and admin roster helper behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend the account hackathon tab model so admin actors get a dedicated Admins tab between Operations and Settings.
2. Reuse the shared AccountHackathonRoleRosterPanel for an admin roster mode instead of creating a separate management surface.
3. Support promoting judge or staff assignments to hackathon_admin while preserving the existing hackathon-local capability on the new admin assignment.
4. Update unit and integration coverage for tab access/order, roster helper behavior, and hackathon_admin role assignment writes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Confirmed the missing surface was a UI/tab regression: the existing role-assignment API already supports hackathon_admin writes, so the fix stayed in the shared roster and tab-access layer.

Kept canonical docs unchanged because this restores the documented admin role-management capability rather than changing the product model.

Validation passed with focused vitest runs plus full lint, typecheck, and unit test commands. `bun run lint` still reports the existing vue/no-v-html warnings in the legal document pages, but it exited successfully and this change introduced no new warnings.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Restored the missing admin-management surface in the account-scoped hackathon workspace by adding an admin-only Admins tab between Operations and Settings and wiring it to the shared role-roster panel. The shared roster helper and panel now support an `admin` mode that lists current hackathon admins, lets authorized actors promote users into `hackathon_admin`, and preserves existing judge or staff capability when a judge or staff member is promoted to admin.

The account hackathon tab-access helper now includes the Admins tab only for hackathon admins and platform admins, so non-admin actors still do not see it. The page tab map and panel rendering were updated accordingly, and the shared roster UI now handles admin-specific labels, badges, and removal behavior while leaving judge and staff visibility rules intact.

Coverage was updated in three places: unit tests for tab ordering/access, unit tests for admin roster helper behavior, and an integration test that exercises `PUT /api/hackathons/:hackathonId/roles/:userId` with `role: hackathon_admin`. Validation run: `bun x vitest run tests/unit/app/utils/account-hackathon-tabs.test.ts tests/unit/app/utils/hackathon-role-roster.test.ts`, `bun x vitest run --config vitest.integration.config.ts tests/integration/server/api/hackathon-admin-routes.test.ts`, `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
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
