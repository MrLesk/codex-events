---
id: TASK-205.2.1.2
title: Rename the blind-review start route contract to start-blind-review
status: Done
assignee: []
created_date: '2026-04-13 06:14'
updated_date: '2026-04-13 06:19'
labels:
  - judging
  - backend
dependencies:
  - TASK-205.2.1.1
references:
  - docs/api-surface.md
parent_task_id: TASK-205.2.1
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Rename the backend start action route and its tests from start-judge-review to the canonical start-blind-review contract.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The backend route file and imports use start-blind-review instead of start-judge-review.
- [ ] #2 Touched tests and server-side callers reference the canonical start-blind-review route path and naming.
- [ ] #3 Targeted backend validation covers the renamed route contract.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Renamed the start action route contract from start-judge-review to start-blind-review and updated backend route coverage accordingly.

Targeted validation passed on the renamed integration path, and supervisor typecheck remained clean after the rename.
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
