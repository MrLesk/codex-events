---
id: TASK-4.6
title: Build submission creation and team submission management flows
status: To Do
assignee: []
created_date: '2026-03-22 22:09'
updated_date: '2026-03-22 22:09'
labels:
  - frontend
  - ui
  - participant
  - submissions
milestone: m-1
dependencies:
  - TASK-3
  - TASK-4.5
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
Create the team-owned submission experience so team admins can create, edit, submit, and withdraw project submissions during the canonical submission window, while team members can monitor submission status across the documented workflow states.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Team admins can create and edit a draft submission, submit it, and withdraw it only during the lifecycle states where those actions are allowed.
- [ ] #2 The UI reflects the difference between no submission, draft submission, submitted submission, locked submission, withdrawn submission, and disqualified submission.
- [ ] #3 Team members can view their team submission status and the UI prevents post-lock editing or withdrawal once the documented guard has passed.
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
