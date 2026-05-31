---
id: TASK-356
title: Fix long creator email overflow in event settings summary
status: Done
assignee: []
created_date: '2026-05-31 20:57'
updated_date: '2026-05-31 20:59'
labels:
  - ui
  - account
dependencies: []
modified_files:
  - app/components/account/events/AccountEventAdminSettingsPanel.vue
priority: medium
ordinal: 54000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The event settings summary should keep long creator email addresses readable without overflowing the stat card or covering neighboring cards.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Long creator names or emails are constrained inside the Created by summary card instead of spilling into adjacent cards.
- [x] #2 The Created by summary card gets enough horizontal space in the event settings summary layout to reduce unnecessary truncation.
- [x] #3 The change remains scoped to the event settings summary UI and preserves the existing card visual style.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implementation followed the existing event settings summary card style. The creator card now uses wider responsive grid tracks and truncates long creator label/meta values inside the card with full values available via title attributes.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Adjusted the event settings summary layout so the Created by card gets a wider responsive column and long creator names or email addresses truncate within the card instead of spilling into adjacent cards. The existing card visual style and data shown are unchanged. Validation: `bun run lint`, `bun run typecheck`, `bun run test:unit`, `bun run test:integration`, and `git diff --check` passed. `bun run test:bdd` was attempted and still fails during BDD fixture reset with the existing `CHECK constraint failed: score` issue before browser specs run. No component test was added because this is a CSS-only layout fix and the repo does not currently have targeted visual component tests for this summary card.
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
