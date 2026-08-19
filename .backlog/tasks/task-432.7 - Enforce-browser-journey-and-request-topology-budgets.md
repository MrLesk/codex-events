---
id: TASK-432.7
title: Enforce browser journey and request-topology budgets
status: To Do
assignee:
  - '@luna-performance'
created_date: '2026-08-19 06:22'
updated_date: '2026-08-19 06:22'
labels: []
dependencies:
  - TASK-432.2
  - TASK-432.3
  - TASK-432.4
  - TASK-432.5
  - TASK-432.6
references:
  - docs/testing-strategy.md
  - DEVELOPMENT.md
parent_task_id: TASK-432
priority: high
type: enhancement
ordinal: 134000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Turn real-user page latency into a repeatable local quality gate. Measure signed-in journeys and fail on architectural regressions such as duplicate bootstrap calls or excessive tab fan-out, while keeping wall-clock budgets calibrated for local CI variability.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A local signed-in browser suite covers account, admin, platform settings, hackathon operations, meetup operations, and registration journeys
- [ ] #2 Tests assert duplicate bootstrap count, critical JSON request count, abandoned-request behavior, and image payload constraints
- [ ] #3 Server-Timing or equivalent structured measurements separate session, actor, authorization, D1, serialization, and render phases
- [ ] #4 Stable topology assertions are blocking; wall-clock latency is reported with documented tolerance appropriate for local and CI environments
- [ ] #5 DEVELOPMENT.md documents how to run, inspect, and update the performance suite
<!-- AC:END -->

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
