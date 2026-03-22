---
id: TASK-3.6
title: Implement application and team formation APIs
status: Done
assignee:
  - '@codex'
created_date: '2026-03-22 18:55'
updated_date: '2026-03-22 22:24'
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
- [x] #1 Users can submit applications with exact-version acceptance of the current hackathon application terms, and admins can review them according to the documented permission model.
- [x] #2 Approved users and team admins can create, rename, discover, open or close teams to join requests, cancel pending join requests, approve or reject join requests, remove members, and leave teams subject to capacity, openness, one-team-per-hackathon, active-admin, and post-submission-close active-member rules.
- [x] #3 Automated tests for this API area include unit and integration coverage plus Auth0-backed end-to-end scenarios for application review, exact-version terms acceptance, and the documented team-management invariants and lifecycle guards.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Re-read the canonical docs, backlog workflows, and current TASK-3.6 record, then validate the stabilized TASK-3.5 route tree, auth foundations, DB helpers, audit helpers, and test harness so the applications / teams / team-join-requests implementation follows live repository conventions rather than the earlier blocked-task assumptions.
2. Implement the applications slice first under server/api/hackathons/[hackathonId]/applications: submit application, get own application, list applications for admins, approve, and reject. Enforce registration_open, one-application-per-hackathon, required profile fields, exact-current-version application-terms acceptance, and documented review permissions.
3. Add shared application and team-formation helpers under server/utils using the existing auth, DB, validation, lifecycle, error, and audit foundations: hackathon loading, approved-user checks, team-formation-state checks, capacity checks, one-team-per-hackathon checks, join-openness checks, join-request transition guards, and deterministic API error responses. Keep DB triggers as the final integrity backstop rather than the primary user-facing guard path.
4. Implement team routes next under server/api/hackathons/[hackathonId]/teams: list teams, get team detail, create team, rename team, update join openness, leave team, and remove member. Enforce approval status, registration_open / submission_open team-formation behavior, and the active-admin plus post-submission-close active-member rules.
5. Implement join-request routes under server/api/hackathons/[hackathonId]/team-join-requests and server/api/hackathons/[hackathonId]/teams/[teamId]/join-requests: create request, list team join requests, cancel own pending request, approve, and reject. Enforce approved application, open team, available capacity, no other active membership, and pending-only state transitions.
6. Add audit writes for sensitive admin or membership-changing actions within TASK-3.6 scope: application approval/rejection, join-request approval/rejection, member removal, and leave actions.
7. Add focused unit coverage for guard logic and state transitions, integration coverage for route behavior and persistence, and Auth0-backed BDD coverage for applicant submission, admin review, team creation, join-request approval, and leave/remove invariants using the existing TASK-3.4/TASK-3.5 persona and session harness.
8. Re-check canonical docs against the implemented behavior during execution. If implementation reveals a canonical-doc mismatch, a material scope change, or a dependency issue outside TASK-3.6, stop and report before proceeding.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
TASK-3.6 has a recorded implementation plan, but it should be treated as a future task rather than active in-progress work until TASK-3.5 is genuinely complete and its route/database conventions are stable.

Current-state note: this task depends on the stabilized API seams and BDD-authored Auth0/session harness produced by TASK-3.5 and TASK-3.4. Older notes that described route ownership as already fully settled or implied implementation had begun are stale and should not be treated as execution status.

When TASK-3.6 starts, use the recorded plan as the baseline and validate it against the then-current `server/api` conventions before editing code.

2026-03-22: Completed the applications slice and validated it with focused unit and integration tests before moving on to shared team-formation helpers and routes.

2026-03-22: Added shared team-formation helpers plus the teams and team-join-requests route slice. Focused validation passed for tests/unit/server/utils/team-formation.test.ts and tests/integration/server/api/team-formation-routes.test.ts. BDD work has not started yet.

2026-03-22: Expanded the Auth0-backed BDD platform fixture reset for TASK-3.6 by pre-approving the judge and platform-admin personas for the fixture hackathon while leaving the regular user unapproved so application submission and admin approval remain real API-driven behavior in end-to-end coverage.

2026-03-22: Final TASK-3.6 validation passed: bunx vitest run tests/unit/server/utils/applications.test.ts tests/unit/server/utils/team-formation.test.ts; bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/application-routes.test.ts tests/integration/server/api/team-formation-routes.test.ts; bun run lint; bun run typecheck; bunx bddgen; bun run test:bdd.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented the full TASK-3.6 backend surface for hackathon applications, team formation, and team join requests. The applications slice remains in place with exact-current-version terms enforcement and admin review routes; the new shared team-formation helper layer now enforces approved-user checks, team-formation lifecycle guards, one-team-per-hackathon constraints, team slug uniqueness, join-request openness and pending-state rules, and the active-admin plus post-submission-close active-member invariants. Added the canonical teams routes for list/detail/create/rename/join-policy/leave/remove, the team-join-request routes for create/list/cancel/approve/reject, focused unit and integration coverage for both slices, and Auth0-backed BDD scenarios covering application submission and approval, approved-user team participation, join-request approval, and the last-admin leave guard. Validation passed with unit, integration, lint, typecheck, bddgen, and the full authenticated/destructive BDD command.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [x] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [x] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
