---
id: TASK-420.3
title: Refine simplified claiming compound layout
status: Done
assignee:
  - '@codex'
created_date: '2026-07-13 20:55'
updated_date: '2026-07-13 21:03'
labels: []
dependencies: []
parent_task_id: TASK-420
priority: high
type: bug
ordinal: 102000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Correct the enabled simplified attendee claiming presentation so the checkbox and setup read as one coherent, responsive control instead of a floating tab with an offset nested border.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The enabled checkbox header and setup content render as one continuous full-width compound section without a staircase or offset border treatment.
- [x] #2 The control remains readable and contained at narrow and desktop widths, with no horizontal clipping or unnecessary nested surface depth.
- [x] #3 Creation save-first state and persisted Settings state continue to use the same shared component and preserve all claiming behavior.
- [x] #4 Automated UI coverage and browser verification confirm the corrected enabled and disabled presentation.
<!-- AC:END -->

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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Simplify the shared control into one rounded compound container with a header and divider. 2. Remove margin and duplicate border treatments from persisted and save-first child content while preserving step hierarchy. 3. Update BDD assertions for the compound relationship, run required validation, verify in Chrome, and commit/push only this bug fix.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Live Chrome inspection at 1920px confirmed the control currently stacks a full-width bordered checkbox row over a 28px-inset panel with a second left rail. The correction keeps the requested nesting through header/content hierarchy rather than offset containers.

UI slice: replaced the floating bordered label plus inset left-rail panel with one full-width rounded compound container. The enabled header now separates from flush child content with a divider; both text and child content use min-width constraints for narrow layouts. BDD now verifies the persisted panel shares the control's x-position and width.

Validation: git diff --check passed; bun run lint passed; bun run typecheck passed; bun run test:unit passed (110 files, 771 tests); focused authenticated BDD passed at desktop and 390px viewport; full bun run test:bdd passed (50 regular/authenticated plus 2 destructive scenarios). Canonical docs, configuration, permissions, and backend behavior are unchanged because this is a presentation-only correction. No known test gaps or follow-up risks remain.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Reworked simplified attendee claiming into one responsive compound control: the checkbox is the header, a divider reveals flush setup content, and the inset left rail and duplicate nested border are gone. The shared creation and persisted Settings component retains all claiming behavior. Verified geometry at desktop and 390px widths through authenticated BDD, with lint, typecheck, 771 unit tests, and the complete 52-scenario BDD suite passing. No follow-up risks are known.
<!-- SECTION:FINAL_SUMMARY:END -->
