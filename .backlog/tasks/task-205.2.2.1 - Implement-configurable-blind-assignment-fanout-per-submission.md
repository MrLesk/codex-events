---
id: TASK-205.2.2.1
title: Implement configurable blind assignment fanout per submission
status: Done
assignee: []
created_date: '2026-04-13 06:19'
updated_date: '2026-04-13 06:24'
labels:
  - judging
  - backend
dependencies:
  - TASK-205.2.1
references:
  - docs/domain-model.md
  - docs/api-surface.md
parent_task_id: TASK-205.2.2
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refactor blind-review setup so each eligible submission receives the configured number of blind assignments, with distinct judges when possible.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Blind-review setup supports blindReviewCount values 0, 1, and 2.
- [ ] #2 When blindReviewCount is greater than 0, eligible submissions receive that many blind assignments with distinct judges when the judge pool allows it.
- [ ] #3 Start-blind-review readiness checks and setup logic stop assuming exactly one active assignment per locked submission.
- [ ] #4 Targeted backend tests cover the configurable blind assignment count behavior.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Blind-review setup now fans out assignments per submission according to blindReviewCount, reusing judges only when the pool is smaller than the requested count.

Judging preparation no longer requires a judge pool when blind review is disabled, and start-blind-review readiness now uses the configured expected assignment count.

Targeted validation passed: `bun x vitest run tests/unit/server/utils/judging.test.ts`.

One canonical doc sentence still says same-submission blind assignments must belong to different judges; runtime now follows the clarified product rule of distinct judges when possible.
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
