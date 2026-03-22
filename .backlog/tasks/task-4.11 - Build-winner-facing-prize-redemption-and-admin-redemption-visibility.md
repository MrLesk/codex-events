---
id: TASK-4.11
title: Build winner-facing prize redemption and admin redemption visibility
status: To Do
assignee: []
created_date: '2026-03-22 22:09'
updated_date: '2026-03-22 22:09'
labels:
  - frontend
  - ui
  - winners
  - prizes
milestone: m-1
dependencies:
  - TASK-3
  - TASK-4.10
documentation:
  - docs/domain-model.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
  - docs/lifecycle-and-state-machines.md
parent_task_id: TASK-4
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the winner-facing redemption workflow and supporting admin visibility so awarded participants can complete prize redemption with legal-name capture and exact-version winner-terms acceptance, and admins can track redemption state and eligibility context.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Prize recipients can see their pending redemption tasks across hackathons and submit the required redemption data from the UI.
- [ ] #2 The redemption flow requires legal name and exact-version acceptance of the current winner terms for the relevant hackathon.
- [ ] #3 Admins can view redemption records and eligibility context without exposing that data to unauthorized users.
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
