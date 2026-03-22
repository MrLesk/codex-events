---
id: TASK-4.1
title: 'Establish the UI shell, navigation, and role-aware entry points'
status: To Do
assignee: []
created_date: '2026-03-22 22:09'
updated_date: '2026-03-22 23:38'
labels:
  - frontend
  - ui
  - shell
milestone: m-1
dependencies:
  - TASK-3
documentation:
  - docs/domain-model.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
  - docs/design-reference.md
  - docs/tech-stack.md
parent_task_id: TASK-4
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the canonical application shell so signed-out users, participants, judges, hackathon admins, and platform admins can enter the product through navigation and landing surfaces that expose only the workflows they are allowed to use. This gives the frontend a stable frame for the rest of the UI milestone and makes role-specific product areas discoverable.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The signed-out experience exposes public hackathon discovery and authentication entry points without exposing authenticated-only workflows.
- [ ] #2 Authenticated users see navigation and dashboard entry points that reflect their effective platform and hackathon roles.
- [ ] #3 The application shell supports moving between the public, participant, judge, admin, account, and winner-facing surfaces defined in the canonical docs.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Supervisor note: worker assignment pending. Shared shell and navigation changes are reserved for this task to minimize conflicts with other Milestone 1 UI work.
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
