---
id: TASK-3.6
title: Implement application and team formation APIs
status: To Do
assignee:
  - '@codex'
created_date: '2026-03-22 18:55'
updated_date: '2026-03-22 21:04'
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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Wait for the TASK-3.5 route-layer seam to be established, unless the supervisor explicitly grants ownership of the `applications` / `teams` / `team-join-requests` subtree under `server/api/hackathons/[hackathonId]/...`.
2. Implement application endpoints first: submit application, get own application, list applications for admins, approve, and reject. Enforce `registration_open`, one application per hackathon, required profile fields, exact-current-version application-terms acceptance, and documented review permissions.
3. Implement shared application and team-formation guard logic using the existing auth, DB, validation, lifecycle, and error foundations: hackathon loading, approved-user checks, team-formation-state checks, capacity checks, one-team-per-hackathon checks, join-openness checks, and deterministic API error responses. Use the DB triggers as the final integrity backstop rather than the primary user-facing guard path.
4. Implement team endpoints next: list teams, get team detail, create team, rename team, update join openness, leave team, and remove member. Enforce approval status, `registration_open` / `submission_open` team-formation behavior, and the active-admin plus post-submission-close active-member rules.
5. Implement join-request endpoints: create request, list team join requests, cancel own pending request, approve, and reject. Enforce approved application, open team, available capacity, no other active membership, and pending-only state transitions.
6. Add audit writes for sensitive admin or membership-changing actions where they fit the shared audit model: application approval / rejection, join-request approval / rejection, member removal, and leave actions.
7. Add focused unit tests for guard logic and state transitions, integration tests for persistence and route behavior, and Auth0-backed end-to-end scenarios for applicant submission, admin review, team creation, join-request approval, and leave / remove invariants through the existing TASK-3.4 persona and session harness.
8. Re-check canonical docs against the implemented behavior during execution. If TASK-3.5 lands conflicting route conventions or implementation reveals a canonical doc mismatch, stop and report before proceeding.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
TASK-3.6 has a recorded implementation plan, but it should be treated as a future task rather than active in-progress work until TASK-3.5 is genuinely complete and its route/database conventions are stable.

Current-state note: this task depends on the stabilized API seams and BDD-authored Auth0/session harness produced by TASK-3.5 and TASK-3.4. Older notes that described route ownership as already fully settled or implied implementation had begun are stale and should not be treated as execution status.

When TASK-3.6 starts, use the recorded plan as the baseline and validate it against the then-current `server/api` conventions before editing code.
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
