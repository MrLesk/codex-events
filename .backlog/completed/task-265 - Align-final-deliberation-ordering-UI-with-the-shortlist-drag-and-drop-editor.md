---
id: TASK-265
title: Align final deliberation ordering UI with the shortlist drag-and-drop editor
status: Done
assignee:
  - codex
created_date: '2026-04-17 20:38'
updated_date: '2026-04-17 20:41'
labels:
  - operations
  - final-deliberation
  - frontend
  - ux
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Use the same polished admin drag-and-drop interaction model in final deliberation that Operations already uses for shortlist ordering, and simplify the final-deliberation screen by removing the unranked submissions section that is no longer useful at that point in the workflow.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The final deliberation ranking editor uses the same shortlist-style drag-and-drop interaction model and row hierarchy instead of the older standalone drag button workflow
- [x] #2 Admins can still reorder the ranked final-deliberation entries and save or reset the draft final order without changing any stored scores
- [x] #3 The final deliberation screen no longer renders the separate unranked submissions section
- [x] #4 Relevant tests or implementation notes are updated and required validation passes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Refactor `app/components/admin/AdminCompetitionFinalDeliberationPanel.vue` to replace the current native drag/drop implementation with the shortlist-style `Sortable` interaction model and row-shell layout.
2. Preserve final-deliberation ordering behavior and save/reset flow while presenting the ranked entries as one polished reorderable list.
3. Remove the separate unranked submissions section from the final-deliberation UI without changing the underlying final-ranking data model.
4. Update implementation notes as needed and run `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-04-17: Context discovery: `AdminCompetitionFinalDeliberationPanel.vue` still uses a standalone native drag/drop implementation with separate drag and move buttons, while `AdminCompetitionShortlistPanel.vue` already has the preferred `Sortable`-based interaction model and row hierarchy. The unranked final-deliberation section is informational only and can be removed without changing ranking semantics.

2026-04-17: Replaced the final-deliberation panel’s standalone native drag/drop implementation with the shortlist-style `Sortable` interaction model plus `AdminEditorRowShell`, using the same arrow-and-grip control language already established in shortlist.

2026-04-17: Final deliberation now renders only the ranked reorderable list; the separate unranked submissions section was removed because it did not affect the saved final order and added unnecessary noise at this stage.

2026-04-17: Canonical docs remain unchanged because this is a presentation-layer alignment only; the final-ranking lifecycle and persistence model did not change.

2026-04-17: Validation passed locally with `bun run lint`, `bun run typecheck`, and `bun run test:unit`. No dedicated component-level tests were added because this admin panel still lacks a Vue component test harness; the remaining gap is limited to browser-level drag-and-drop regression coverage.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aligned the final-deliberation ordering UI with the shortlist editor. `AdminCompetitionFinalDeliberationPanel.vue` no longer uses the older native drag/drop flow with a separate `Drag` button and `Move up / Move down` action cluster. It now uses the same shortlist-style interaction model: `Sortable`-based drag and drop, the shared `AdminEditorRowShell`, grip handle, and matching move-arrow controls.

The underlying final-deliberation behavior is unchanged. Admins still reorder only the ranked entries, save the draft final order, or reset back to the persisted order without changing any stored blind or pitch scores. The panel now presents that ranked list with the tighter shortlist-style hierarchy while keeping the existing score detail cards for combined, blind, and pitch scores.

The separate `UNRANKED SUBMISSIONS` section was removed from the final-deliberation UI. It was informational only and did not affect the saved ranking, so dropping it simplifies the screen without changing any canonical outcome rules.

Canonical docs remain unchanged because this is a presentation-layer refactor. Validation passed locally with `bun run lint`, `bun run typecheck`, and `bun run test:unit`. There is still no dedicated Vue component test harness for this admin panel, so the remaining automation gap is limited to browser-level drag-and-drop regression coverage.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [x] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
