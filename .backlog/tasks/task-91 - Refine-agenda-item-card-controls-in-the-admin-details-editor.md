---
id: TASK-91
title: Refine agenda item card controls in the admin details editor
status: Done
assignee:
  - Codex
created_date: '2026-03-29 17:02'
updated_date: '2026-03-29 17:02'
labels:
  - admin
  - ui
  - hackathons
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Tighten the schedule item editing layout in the hackathon Details admin flow so ordering controls and delete actions are clearer and consume less horizontal space. The agenda card should use a dedicated left rail for ordering controls, keep the edit inputs in the center, and move deletion into a mirrored right rail while preserving the existing agenda editing behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Agenda item cards use a three-column layout with order controls on the left inputs in the middle and a delete action on the right.
- [x] #2 The agenda item editor no longer shows the old text-based move and remove controls or the Agenda item ordinal label.
- [x] #3 The description field uses a compact single-line default height while remaining editable as a textarea.
- [x] #4 Validation coverage is rerun for the updated admin schedule editor layout.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Confirmed canonical docs remain unchanged for this admin-only schedule editor refinement. Updated the agenda item card layout in the shared hackathon config form to use mirrored side rails with ordering controls on the left and deletion on the right while keeping the edit fields centered. Validation completed with bun run typecheck and bun run test:unit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Refined the admin Details agenda item editor so each card now uses a three-column layout with a left ordering rail, centered inputs, and a mirrored delete rail on the right. The old text-based move and remove controls and the agenda item ordinal label were removed, the description field now opens at a compact single-line height, and spacing was adjusted around the time row for a cleaner editing surface.

Validation: bun run typecheck, bun run test:unit.
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
