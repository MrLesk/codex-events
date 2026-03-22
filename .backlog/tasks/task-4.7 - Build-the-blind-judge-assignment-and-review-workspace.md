---
id: TASK-4.7
title: Build the blind judge assignment and review workspace
status: To Do
assignee: []
created_date: '2026-03-22 22:09'
updated_date: '2026-03-22 22:09'
labels:
  - frontend
  - ui
  - judge
  - judging
milestone: m-1
dependencies:
  - TASK-3
  - TASK-4.1
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
Create the judge workspace so judges can review assigned submissions in the blind judging view, track assignment progress, and record canonical judging outcomes without exposing team identity.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Judges can list and open their active assignments and the review surface excludes team identity while presenting anonymized application context.
- [ ] #2 Judges can start, complete, skip, and mark assignments ineligible according to the canonical judging workflow.
- [ ] #3 The UI distinguishes assignment states and prevents judge actions that violate documented lifecycle or assignment guards.
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
