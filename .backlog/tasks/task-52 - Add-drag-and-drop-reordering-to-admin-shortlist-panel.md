---
id: TASK-52
title: Add drag-and-drop reordering to admin shortlist panel
status: Done
assignee: []
created_date: '2026-03-27 22:28'
updated_date: '2026-03-27 22:28'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Improve the admin competition shortlist UX by allowing direct drag-and-drop reordering in addition to move up/down controls, while preserving existing shortlist save/reset behavior and APIs.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Admin competition shortlist entries can be reordered via drag and drop in the shortlist panel when shortlist reordering is enabled.
- [x] #2 Existing move up/down controls and save/reset shortlist actions continue to work as before.
- [x] #3 Shortlist drag/drop reordering only updates draft order until the admin explicitly saves.
- [x] #4 Validation passes with bun run typecheck and bun run test:unit.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend shortlist panel local draft reorder logic with drag source/target state and drop handlers.
2. Add drag handles and drop-target visuals to shortlist entry cards while keeping move up/down controls.
3. Keep existing save/reset workflow unchanged so drag actions only affect draft ordering until saved.
4. Validate with typecheck, lint, and unit tests.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented drag-and-drop purely in the shortlist panel component using existing `draftShortlist` state, so no API or data contract changes were needed. Existing lint warnings are unchanged trusted v-html warnings outside this scope.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added drag-and-drop shortlist reordering support to the admin competition panel.

What changed:
- Updated `app/components/admin/AdminCompetitionShortlistPanel.vue` to support drag source/target state and drop handlers.
- Added a drag handle button per shortlist item (only when shortlist reordering is enabled).
- Added drop target highlighting and drop-zone behavior on shortlist cards.
- Reused existing draft reorder model so drag/drop updates only local draft ordering (`finalRank` recomputed locally).
- Preserved existing move up/down controls and existing Save shortlist order / Reset order flows.

Validation:
- `bun run typecheck` passed.
- `bun run test:unit` passed.
- `bun run lint` passed with existing repo warnings only (`vue/no-v-html` in unrelated files).

Risk/follow-up:
- No API/backend changes in this task; behavior is UI-local until save action is triggered.
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
