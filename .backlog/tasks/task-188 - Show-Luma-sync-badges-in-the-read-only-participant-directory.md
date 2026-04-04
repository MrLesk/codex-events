---
id: TASK-188
title: Show Luma sync badges in the read-only participant directory
status: Done
assignee: []
created_date: '2026-04-04 13:23'
updated_date: '2026-04-04 13:23'
labels:
  - bug
  - admin-ui
  - luma
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Restore Luma sync visibility on participant cards rendered through the read-only participant directory. Admins need to see the stored Luma sync outcome on approved and rejected participant cards even when the view does not allow staging decisions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The participant directory shows the Luma sync badge for decided applications when a `lumaSyncStatus` value is present.
- [x] #2 Submitted applications without a decided status still do not show a Luma sync badge.
- [x] #3 Automated tests cover the read-only participant-directory visibility case.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
The read-only participant directory rendered the same participant cards as the editable review view, but `shouldShowApplicationLumaSyncStatus()` hid the badge whenever `readOnly` was true. That suppressed the Luma sync chip even when `lumaSyncStatus` existed on approved or rejected applications.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Removed the read-only visibility gate from the Luma sync badge helper so decided applications show their stored sync status in both the editable review panel and the read-only participant directory. Updated the shared admin workspace unit test to cover the read-only case and kept submitted applications hidden as before.

Validation:
- `bun x vitest run tests/unit/app/utils/admin-workspace.test.ts`
- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`
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
