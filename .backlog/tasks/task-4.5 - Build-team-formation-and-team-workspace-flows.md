---
id: TASK-4.5
title: Build team formation and team workspace flows
status: To Do
assignee: []
created_date: '2026-03-22 22:09'
updated_date: '2026-03-22 22:09'
labels:
  - frontend
  - ui
  - participant
  - teams
milestone: m-1
dependencies:
  - TASK-3
  - TASK-4.4
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
Create the team formation and membership-management experience so approved users can create teams, discover open teams, request to join, manage join requests, and maintain valid team membership through the allowed lifecycle states.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Approved users can create teams, browse eligible teams, and request to join open teams during the allowed team-formation states.
- [ ] #2 Team admins can manage join openness, review join requests, and manage membership while respecting canonical admin-presence and member-count constraints.
- [ ] #3 Team members can view their own team workspace and the UI reflects when team actions are no longer allowed because of lifecycle or capacity constraints.
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
