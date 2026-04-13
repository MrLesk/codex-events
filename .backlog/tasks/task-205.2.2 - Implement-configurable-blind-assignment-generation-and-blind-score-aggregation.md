---
id: TASK-205.2.2
title: Implement configurable blind assignment generation and blind score aggregation
status: Done
assignee: []
created_date: '2026-04-13 06:13'
updated_date: '2026-04-13 06:40'
labels:
  - judging
  - backend
dependencies:
  - TASK-205.2.1
references:
  - docs/domain-model.md
  - docs/api-surface.md
parent_task_id: TASK-205.2
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refactor blind-review backend logic so each hackathon can require 0, 1, or 2 blind reviews per submission with distinct judges and normalized blind score aggregation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Blind-review setup creates the configured number of blind assignments per eligible submission with distinct judges where possible.
- [x] #2 Blind judging utilities and APIs treat blind review as the canonical replacement for judge_review.
- [x] #3 Blind score aggregation uses the documented normalized 0..10 scoring model across completed blind assignments.
- [x] #4 Targeted backend tests cover the configurable blind-review count behavior.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
The first child task implemented configurable blind assignment fanout per submission and kept typecheck clean.

The next child task updates blind score aggregation so leaderboard/outcome math no longer assumes a single blind assignment per submission.

Both blind-assignment fanout and normalized blind score aggregation are implemented and covered by targeted backend tests.
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
