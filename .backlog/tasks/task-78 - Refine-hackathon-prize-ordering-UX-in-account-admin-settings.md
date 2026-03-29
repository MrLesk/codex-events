---
id: TASK-78
title: Refine hackathon prize ordering UX in account admin settings
status: Done
assignee:
  - codex
created_date: '2026-03-29 15:04'
updated_date: '2026-03-29 15:16'
labels: []
dependencies: []
documentation:
  - docs/permissions-matrix.md
  - docs/api-surface.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the admin prize-configuration panel so the new-prize editor stays below the existing configured prize rows, the prize rows are more compact, and reordering has clearer grab/drop affordances. Use the existing repo patterns and avoid redundant UI copy.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The new-prize editor remains below the existing configured prize rows in the admin prize-configuration panel.
- [x] #2 Prize rows use a clear left-side grab handle and clearer drop targets for drag-and-drop reordering.
- [x] #3 The redundant inline summary that repeats reward type and rank information is removed.
- [x] #4 Prize rows are visually more compact without removing any editable fields.
- [x] #5 Focused automated coverage is updated for any changed ordering behavior or ordering defaults relevant to the editor layout.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Keep the new-prize editor positioned below the existing configured prize rows in the admin prize-configuration panel.
2. Replace the custom HTML drag handlers in the prize list with a small sortable library integration, using a dedicated left-side drag handle and explicit drop-state styling.
3. Tighten the prize-row layout so all fields remain available while the row is more compact, and remove the redundant trailing summary text.
4. Add focused automated coverage for the editor ordering behavior and run the relevant validation commands.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Confirmed canonical docs remain unchanged for this UI-only admin refinement.

Integrated SortableJS into the prize editor with a dedicated left-side drag handle, drop-state styling, and the add-prize form positioned below the configured prize list.

Added focused automated coverage for list reordering via app/utils/reorder-list.ts and its unit test. Full drag interaction remains covered manually through the admin UI because the current unit suite does not exercise pointer-driven Sortable behavior.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Moved the admin add-prize form so it stays below the configured prize rows, keeping the participant-facing prize list behavior unchanged. Replaced the custom HTML5 prize drag handlers with a SortableJS integration that uses a dedicated left-side grab handle, clearer drop-target styling, and the existing move up/down fallback buttons. Tightened the prize row spacing without removing any editable fields and removed the redundant trailing reward/rank summary text.

Added a small reorder utility with focused unit coverage for index-based list moves, which is the ordering behavior introduced by the Sortable integration. Validation passed with `bunx vitest run tests/unit/app/utils/reorder-list.test.ts`, `bun run test:unit`, `bun run typecheck`, and `bun run lint` (lint still reports the pre-existing `vue/no-v-html` warnings in the legal/static pages). Residual gap: there is no automated component test for pointer-driven drag/drop in this admin panel yet, so the exact drag interaction is still best confirmed manually in-browser if needed.
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
