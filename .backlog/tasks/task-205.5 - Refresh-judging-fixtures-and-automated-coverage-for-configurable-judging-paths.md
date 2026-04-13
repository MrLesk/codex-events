---
id: TASK-205.5
title: Refresh judging fixtures and automated coverage for configurable judging paths
status: Done
assignee: []
created_date: '2026-04-12 22:08'
updated_date: '2026-04-13 10:18'
labels:
  - judging
  - tests
dependencies:
  - TASK-205.3
  - TASK-205.4
references:
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/api-surface.md
parent_task_id: TASK-205
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update fixture data and automated coverage to exercise blind-only, blind-plus-pitch, and pitch-only hackathon behavior across server and app layers.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Shared fixtures encode the supported judging configurations, including manual shortlist finalists and partial pitch participation when admins close the stage early.
- [x] #2 Unit and integration coverage assert the new lifecycle transitions, assignment expectations, and weighted final-score behavior.
- [x] #3 BDD coverage or documented gaps cover the admin and judge-facing workflows affected by configurable judging.
- [x] #4 Required validation commands pass locally after the fixture and test updates.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Split into child tasks: TASK-205.5.1 for non-BDD automated coverage and TASK-205.5.2 for BDD fixture/workflow refresh to keep one bounded worker per task.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed the judging fixture and automated coverage refresh for configurable judging. Shared fixtures now encode blind-only and blind-plus-pitch states with canonical `blind_review`, `pitch_review`, and `final_deliberation` behavior, manual finalist selection, weighted final scores, and partial pitch participation when admins move forward before every judge submits. Non-BDD unit and integration coverage was updated under TASK-205.5.1, and authenticated BDD coverage under TASK-205.5.2 now exercises the blind judge workspace plus the shortlist-to-winners path with pitch review and final deliberation. Canonical docs were reviewed and remained unchanged. Validation for this task now includes targeted unit, integration, and authenticated BDD slices plus the final repo-wide gates of `bun run lint`, `bun run typecheck`, `bun run test:unit`, `bun run test:integration`, and the full `bun run test:bdd` suite.
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
