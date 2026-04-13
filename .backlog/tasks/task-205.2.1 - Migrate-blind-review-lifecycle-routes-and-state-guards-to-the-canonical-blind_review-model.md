---
id: TASK-205.2.1
title: >-
  Migrate blind-review lifecycle routes and state guards to the canonical
  blind_review model
status: Done
assignee: []
created_date: '2026-04-13 06:13'
updated_date: '2026-04-13 06:19'
labels:
  - judging
  - backend
dependencies:
  - TASK-205.1.1
references:
  - docs/api-surface.md
  - docs/lifecycle-and-state-machines.md
parent_task_id: TASK-205.2
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the old judge_review route/state wiring with the canonical blind_review naming and route contracts so backend lifecycle and assignment action handlers compile against the updated state enum.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Blind-review start action and judging assignment action guards use blind_review instead of judge_review.
- [ ] #2 Backend tests for the touched blind-review routes and handlers use the canonical state names and route path where this task changes them.
- [ ] #3 Targeted backend validation clears the current blind-review route type errors.
- [ ] #4 This task does not yet implement multiple blind assignments per submission or pitch-review backend behavior.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
The first child task cleared the enum-literal mismatch in the current blind-review route handlers and restored typecheck.

The next child task renames the start action route contract from start-judge-review to start-blind-review.

Both child tasks are complete: blind-review route handlers now use blind_review and the start route contract has been renamed to start-blind-review.

Full typecheck is clean again after the blind-review route migration.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Canonical docs were updated or confirmed unchanged
- [ ] #2 Code behavior matches canonical docs
- [ ] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [ ] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [ ] #7 Auth and permissions changes follow the documented platform model
- [ ] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
