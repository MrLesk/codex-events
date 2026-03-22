---
id: TASK-4.2
title: Build public hackathon discovery and detail surfaces
status: To Do
assignee: []
created_date: '2026-03-22 22:09'
updated_date: '2026-03-22 22:09'
labels:
  - frontend
  - ui
  - public
milestone: m-1
dependencies:
  - TASK-3
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
Create the public and authenticated hackathon discovery experience so users can find programs, inspect details, and understand timeline, criteria, prizes, and current terms context before applying, joining, judging, or administering a hackathon.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The UI provides a hackathon list experience that surfaces canonical discovery information and current lifecycle state.
- [ ] #2 The hackathon detail experience presents canonical fields, timeline context, evaluation criteria, prizes, and current terms references appropriate to the viewer.
- [ ] #3 The public detail surface does not expose restricted operational data reserved for admins, judges, team members, or approved users.
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
