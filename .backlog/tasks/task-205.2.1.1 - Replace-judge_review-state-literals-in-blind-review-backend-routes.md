---
id: TASK-205.2.1.1
title: Replace judge_review state literals in blind-review backend routes
status: Done
assignee: []
created_date: '2026-04-13 06:14'
updated_date: '2026-04-13 06:16'
labels:
  - judging
  - backend
dependencies:
  - TASK-205.1.1
references:
  - docs/lifecycle-and-state-machines.md
parent_task_id: TASK-205.2.1
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the existing blind-review start and assignment action route handlers so they reference blind_review instead of judge_review and compile against the updated state enum.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Touched route handlers and lifecycle guards use blind_review in place of judge_review.
- [ ] #2 Targeted backend validation clears the current route type errors caused by the old judge_review literal.
- [ ] #3 The task stays within the existing route file set and does not yet rename route paths or implement multi-assignment behavior.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Existing blind-review route handlers now gate and transition on blind_review instead of judge_review.

Targeted validation passed: `bun run typecheck`.
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
