---
id: TASK-129
title: 'Fix platform admin role-roster behavior for staff, judge, and admin tabs'
status: Done
assignee: []
created_date: '2026-03-30 21:36'
updated_date: '2026-03-30 21:38'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Normalize the account hackathon role-roster behavior so platform admins are treated as admin-capable across the Judges, Staff, and Admins tabs even when their current explicit hackathon role row is not `hackathon_admin`. The roster UI should not offer replacement actions that imply a platform admin is not already an admin, and staff/judge mutations should preserve or normalize the admin-capable assignment shape instead of downgrading platform admins to non-admin role rows.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Platform admins appear as admin-capable in the role roster surfaces and do not show misleading replacement actions in the Admins tab.
- [x] #2 Granting staff access or judging access to a platform admin uses the admin-capable path instead of replacing the user with a non-admin role.
- [x] #3 Removing staff or judge capability from a platform admin preserves their effective admin access in the roster model.
- [x] #4 Automated coverage is updated for platform-admin roster classification and action behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the shared hackathon role-roster helper to treat platform admins as admin-capable even when a stored hackathon role row is stale.
2. Update the shared AccountHackathonRoleRosterPanel mutation paths so platform admin staff/judge actions normalize back to a hackathon_admin assignment while preserving capability flags.
3. Extend unit coverage for platform-admin roster classification and normalized flag preservation.
4. Run the required validation commands and record the outcome.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
This bug came from a mismatch between platform-admin inheritance and the roster UI: the UI treated only `assignment.role === hackathon_admin` as admin-capable, so stale `judge` rows for platform admins produced replacement actions in Staff/Admins.

Kept canonical docs unchanged because the docs already say platform admins are admin-capable and only admin assignments can combine judging/staff designation. The code was the part drifting from the documented model.

The follow-up fix stays in the shared roster helper/UI layer. Platform-admin staff and judge actions now normalize back to `hackathon_admin` while preserving the relevant capability flag instead of leaving the user on a non-admin explicit role row.

Validation passed: focused vitest roster tests, `bun run lint`, `bun run typecheck`, and `bun run test:unit`. `bun run lint` still reports the pre-existing vue/no-v-html warnings in legal-document pages and introduced no new warnings.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Normalized platform-admin behavior in the shared hackathon role-roster flow so platform admins are treated as admin-capable across the Judges, Staff, and Admins tabs even when a stale explicit hackathon role row exists. The shared roster helper now classifies platform admins as admin-capable for roster rendering, which moves them out of misleading replacement flows in the Admins tab and allows the staff/judge tabs to use admin-style labels and grouping.

The shared AccountHackathonRoleRosterPanel mutation logic now routes platform-admin staff and judge actions through admin-capable normalization instead of replacing the user with a non-admin role. When a stale platform-admin `judge` or `staff` row is touched, the panel now upserts `hackathon_admin` and preserves the effective judging/staff flag state while adding or removing the requested capability.

Coverage was extended in the role-roster helper unit tests to assert platform-admin classification and flag preservation. Validation run: `bun x vitest run tests/unit/app/utils/hackathon-role-roster.test.ts tests/unit/app/utils/account-hackathon-tabs.test.ts`, `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
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
