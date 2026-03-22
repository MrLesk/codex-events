---
id: TASK-4.9
title: 'Build admin operational views for applications, teams, and submissions'
status: To Do
assignee: []
created_date: '2026-03-22 22:09'
updated_date: '2026-03-22 22:09'
labels:
  - frontend
  - ui
  - admin
  - operations
milestone: m-1
dependencies:
  - TASK-3
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
Create the admin operational surfaces for reviewing applications, monitoring teams and submissions, and handling operational interventions during an active hackathon. Admins need this view to run the program according to the documented permissions and lifecycle rules.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Admins can review and act on applications from the UI using the canonical state transitions.
- [ ] #2 Admins can inspect teams, submission status, and the computed no-submission section without relying on participant or judge views.
- [ ] #3 The operational UI clearly separates admin interventions such as admin-withdrawal and disqualification from participant-driven actions.
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
