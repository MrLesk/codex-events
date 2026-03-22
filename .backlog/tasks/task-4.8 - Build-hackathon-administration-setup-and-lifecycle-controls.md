---
id: TASK-4.8
title: Build hackathon administration setup and lifecycle controls
status: To Do
assignee: []
created_date: '2026-03-22 22:09'
updated_date: '2026-03-22 22:09'
labels:
  - frontend
  - ui
  - admin
  - configuration
milestone: m-1
dependencies:
  - TASK-3
  - TASK-4.1
documentation:
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
  - docs/design-reference.md
parent_task_id: TASK-4
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the administration surfaces needed to configure and operate a hackathon before and during participant activity. Platform admins and hackathon admins need a canonical UI for program configuration, lifecycle transitions, terms, criteria, prizes, and role management.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Authorized admins can create and update hackathon configuration, including schedules, location, images, team-size limits, and required profile flags.
- [ ] #2 Authorized admins can manage current hackathon terms, evaluation criteria, prize definitions, and role assignments within canonical permissions.
- [ ] #3 The UI exposes only the lifecycle actions allowed to the current admin and current hackathon state.
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
