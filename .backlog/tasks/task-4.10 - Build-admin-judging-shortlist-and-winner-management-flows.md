---
id: TASK-4.10
title: 'Build admin judging, shortlist, and winner-management flows'
status: To Do
assignee: []
created_date: '2026-03-22 22:09'
updated_date: '2026-03-22 22:09'
labels:
  - frontend
  - ui
  - admin
  - judging
  - winners
milestone: m-1
dependencies:
  - TASK-3
  - TASK-4.7
  - TASK-4.8
documentation:
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
parent_task_id: TASK-4
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the admin workflows that run the competition after submissions close, including assignment oversight, allowed judge-intervention actions, shortlist review, manual final ranking reorder, winner announcement, and hackathon completion.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Admins can monitor judge assignment progress and perform only the documented intervention actions for the current assignment state.
- [ ] #2 The UI exposes computed leaderboard and shortlist views, including manual shortlist reordering without changing underlying judge scores.
- [ ] #3 The UI supports winner announcement and completed-hackathon outcomes only in the canonical lifecycle states.
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
