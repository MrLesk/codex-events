---
id: TASK-4.4
title: Build the participant hackathon application experience
status: To Do
assignee: []
created_date: '2026-03-22 22:09'
updated_date: '2026-03-22 22:09'
labels:
  - frontend
  - ui
  - participant
  - applications
milestone: m-1
dependencies:
  - TASK-3
  - TASK-4.3
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
Create the participant application workflow so a user can apply to a hackathon, satisfy required-profile rules, accept the correct application terms version, and track the application outcome before team formation. This is the canonical entry into hackathon participation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A user can view their application status for a hackathon and submit an application only when the hackathon is in `registration_open`.
- [ ] #2 The application UI enforces required-profile and exact-version application-terms acceptance requirements from the canonical docs.
- [ ] #3 The UI clearly distinguishes submitted, approved, and rejected application states and the actions available in each state.
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
