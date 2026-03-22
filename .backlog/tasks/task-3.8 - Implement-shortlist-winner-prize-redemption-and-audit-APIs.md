---
id: TASK-3.8
title: 'Implement shortlist, winner, prize redemption, and audit APIs'
status: To Do
assignee: []
created_date: '2026-03-22 18:55'
updated_date: '2026-03-22 19:00'
labels:
  - backend
  - api
  - prizes
  - audit
milestone: m-0
dependencies:
  - TASK-3.1
  - TASK-3.2
  - TASK-3.3
  - TASK-3.4
  - TASK-3.5
  - TASK-3.7
documentation:
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/permissions-matrix.md
  - docs/schema-outline.md
parent_task_id: TASK-3
priority: high
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the backend APIs that cover the end of the hackathon workflow after judging. This work must expose the computed leaderboard, shortlist and ranking review process, support winner announcement and prize redemption requirements, and provide the restricted audit access needed for operational review.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The backend exposes the documented computed leaderboard, shortlist, and winner workflows, including admin-controlled final ranking actions without changing underlying judge scores.
- [ ] #2 Prize eligibility and redemption behavior follow the documented freeze point, recipient requirements, and exact-version winner-terms acceptance requirements.
- [ ] #3 Automated tests for this API area include unit and integration coverage plus Auth0-backed end-to-end scenarios for leaderboard and shortlist visibility, winner and prize actions, and operational audit access.
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
