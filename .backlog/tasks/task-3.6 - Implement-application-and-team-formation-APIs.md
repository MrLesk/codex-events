---
id: TASK-3.6
title: Implement application and team formation APIs
status: To Do
assignee: []
created_date: '2026-03-22 18:55'
updated_date: '2026-03-22 19:00'
labels:
  - backend
  - api
  - teams
milestone: m-0
dependencies:
  - TASK-3.1
  - TASK-3.2
  - TASK-3.3
  - TASK-3.4
  - TASK-3.5
documentation:
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/permissions-matrix.md
  - docs/schema-outline.md
parent_task_id: TASK-3
priority: high
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the backend APIs that cover participant application review and team formation. This work must enforce exact-version acceptance of hackathon application terms, approval requirements, hackathon-state constraints, team membership limits, full team-management behavior, join-request rules, and the requirement that each active team always retains valid admin coverage.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Users can submit applications with exact-version acceptance of the current hackathon application terms, and admins can review them according to the documented permission model.
- [ ] #2 Approved users and team admins can create, rename, discover, open or close teams to join requests, cancel pending join requests, approve or reject join requests, remove members, and leave teams subject to capacity, openness, one-team-per-hackathon, active-admin, and post-submission-close active-member rules.
- [ ] #3 Automated tests for this API area include unit and integration coverage plus Auth0-backed end-to-end scenarios for application review, exact-version terms acceptance, and the documented team-management invariants and lifecycle guards.
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
