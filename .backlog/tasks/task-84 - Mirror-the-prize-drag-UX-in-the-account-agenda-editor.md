---
id: TASK-84
title: Mirror the prize drag UX in the account agenda editor
status: Done
assignee: []
created_date: '2026-03-29 16:15'
updated_date: '2026-03-29 16:17'
labels:
  - ui
  - admin
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the agenda editor used in the account hackathon Details tab so it uses the same improved drag-and-drop UX as the prize editor, with a dedicated left-side grab handle and clearer drop feedback. Also change the Details-tab agenda-only submit button label from 'Save Agenda' to 'Save'.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The account hackathon agenda editor uses a dedicated left-side drag handle and clearer drop-state styling for agenda item reordering.
- [x] #2 Agenda item reordering still updates display order correctly and keeps the existing move up/down fallback controls.
- [x] #3 The Details-tab agenda-only submit button label reads 'Save'.
- [x] #4 Validation passes and any lack of focused automated UI coverage is documented if no practical test exists.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Confirmed canonical docs remain unchanged for this UI-only agenda-editor refinement.

Replaced the shared agenda editor's raw HTML5 drag handlers with the same Sortable-based left-handle drag UX used in the prize editor, including clear drop-state styling and preserved move up/down fallback controls.

Changed the account Details-tab agenda-only submit label from 'Save Agenda' to 'Save'. No focused automated UI test was added because this remains a template/interaction refinement in an admin area without component-level coverage.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated the shared agenda editor used by the account hackathon Details tab so agenda items now reorder with the same improved UX as the prize editor: a dedicated left-side grab handle, Sortable-backed drag behavior, clearer drop-target styling, and the existing move up/down controls retained as a fallback. Also changed the agenda-only Details-tab submit button label from `Save Agenda` to `Save`.

The implementation lives in the shared `HackathonConfigForm`, so the improved agenda drag UX now applies consistently anywhere that editor is shown. Validation passed with `bun run typecheck`, `bun run test:unit`, and `bun run lint` (lint still reports the pre-existing `vue/no-v-html` warnings in the legal/static pages). Residual gap: there is still no focused automated component coverage for this agenda-editor drag interaction, since the repo does not currently test this admin UI at that level.
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
