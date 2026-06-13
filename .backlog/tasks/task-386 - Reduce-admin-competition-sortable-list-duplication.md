---
id: TASK-386
title: Reduce admin competition sortable list duplication
status: Done
assignee:
  - codex
created_date: '2026-06-13 14:57'
updated_date: '2026-06-13 15:02'
labels:
  - admin-ui
  - frontend
  - refactor
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Reduce duplicated Sortable setup, drag and move controls, and repeated admin row control markup between the shortlist and final-deliberation competition panels without merging their distinct business workflows.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Shortlist and final-deliberation keep separate panel state, copy, stage semantics, and API payloads.
- [x] #2 Shared admin primitives cover the repeated Sortable lifecycle and row move/drag controls where they remove concrete duplication.
- [x] #3 Existing `data-testid` hooks, click/keyboard move controls, and Sortable drag behavior are preserved.
- [x] #4 Required validation passes: `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extract a focused composable for client-only Sortable setup and teardown that supports one or more list elements.
2. Extract a focused admin row controls component for the repeated move-up, drag-handle, and move-down button group.
3. Update the shortlist and final-deliberation panels to use those primitives while keeping their business logic local.
4. Run required validation and document any remaining drag/drop test gap.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-06-13: Backlog MCP resources were unavailable in this session, so task tracking is using the checked-in `.backlog` task format. Existing related tasks introduced the shortlist drag/drop editor and aligned final deliberation to it; this task handles the remaining local duplication only.

2026-06-13: Added `useAdminSortableLists` for client-only Sortable loading, initialization, teardown, and active-drag cleanup across one or more list elements. Added `AdminSortableEditorRow` to own the repeated article styling, `AdminEditorRowShell` usage, and move-up / drag-handle / move-down controls while preserving caller-provided data attributes and test IDs.

2026-06-13: Updated `AdminCompetitionShortlistPanel.vue` and `AdminCompetitionFinalDeliberationPanel.vue` to use the shared primitives. The shortlist still owns finalist/not-finalist section movement and emits the same shortlist/start-pitch payloads. Final deliberation still owns single-list ranking movement and emits the same reorder/draft-change payloads.

2026-06-13: Validation passed with `bun run typecheck`, `bun run lint`, `bun run test:unit`, and `git diff --check`. Integration and BDD suites were not run because this refactor did not change server integrations, Auth0-backed flows, browser workflow semantics, or API contracts.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Reduced the duplicated admin competition sortable-list implementation without merging the two panels. `AdminCompetitionShortlistPanel.vue` and `AdminCompetitionFinalDeliberationPanel.vue` now share a small Sortable lifecycle composable and a reusable sortable editor row component, while their business-specific ranking state, copy, stage behavior, and emitted payloads remain local to each panel.

Existing `data-testid` hooks and Sortable selectors were preserved by passing the exact row, id, handle, and test-id attributes into the shared row. Required validation passed with `bun run lint`, `bun run typecheck`, and `bun run test:unit`. Residual risk: drag-and-drop itself remains covered by existing browser-level flows and manual behavior rather than a dedicated pointer-driven component unit test.
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
