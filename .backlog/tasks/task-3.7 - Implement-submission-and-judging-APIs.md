---
id: TASK-3.7
title: Implement submission and judging APIs
status: To Do
assignee:
  - '@codex'
created_date: '2026-03-22 18:55'
updated_date: '2026-03-22 21:04'
labels:
  - backend
  - api
  - judging
milestone: m-0
dependencies:
  - TASK-3.1
  - TASK-3.2
  - TASK-3.3
  - TASK-3.4
  - TASK-3.5
  - TASK-3.6
documentation:
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/permissions-matrix.md
  - docs/schema-outline.md
parent_task_id: TASK-3
priority: high
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the backend APIs that cover team submissions and the judging workflow. This work must enforce submission-state rules, the transition into judging preparation, blind judging visibility, review progress, ineligibility handling, reassignment rules, disqualification behavior, and the documented no-submission operational read model described in the canonical docs.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Team admins can manage submissions only in the documented lifecycle states, including submit and withdraw behaviors before judging preparation begins, and the backend exposes the documented no-submission team section data needed for operational views.
- [ ] #2 Judging preparation and active review follow the documented blind-review, assignment, scoring, ineligibility, skip, reassignment, and disqualification rules.
- [ ] #3 Automated tests for this API area include unit and integration coverage plus Auth0-backed end-to-end scenarios for submission locking, visibility restrictions, review-state guards, reassignment behavior, no-submission derived reads, and audit-relevant actions.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Confirm the settled ownership and placement for `POST /api/hackathons/:hackathonId/actions/start-judging-preparation`, `POST /api/hackathons/:hackathonId/actions/start-judge-review`, `GET|POST|PATCH /api/hackathons/:hackathonId/teams/:teamId/submission`, `POST /api/hackathons/:hackathonId/teams/:teamId/submission/actions/*`, `GET /api/hackathons/:hackathonId/no-submission-teams`, and `GET|POST /api/hackathons/:hackathonId/judging/assignments*` after `TASK-3.5` and `TASK-3.6` are settled. If those files or conventions are still moving, stop and report before editing.
2. Add task-local submission and judging helpers under `server/utils` that reuse the existing auth, DB, validation, lifecycle, and audit foundations. These helpers should cover entity loading, guard enforcement, response serialization, blind-view shaping, no-submission derived reads, initial assignment distribution, and low-load reassignment.
3. Implement submission routes for get/create/update/submit/withdraw/admin-withdraw/disqualify plus the admin `no-submission-teams` read model, enforcing the documented `submission_open`, pre-`judging_preparation`, and post-review disqualification rules.
4. Implement hackathon judging lifecycle routes for `start-judging-preparation` and `start-judge-review`, including submission locking, prize-eligibility snapshot creation, and initial judge assignment creation from the automatic judge pool.
5. Implement judging assignment routes for list/detail/start/complete/skip/mark-ineligible/reassign/force-skip/revert-ineligibility, preserving blind review for assignment-driven access and admin-only operational actions where required.
6. Add audit logging for submission withdrawal, admin withdrawal, disqualification, judging-preparation start, judge-review start, ineligibility decisions, reassignment, and forced skips.
7. Add unit coverage for submission-state guards, blind-view shaping, assignment-state transitions, and low-load redistribution; integration coverage for route behavior, persistence, audit writes, no-submission derived reads, and snapshot/assignment creation; and Auth0-backed end-to-end scenarios for team-admin submission flow, judge review flow, and admin intervention flow.
8. Re-check code against the canonical docs before finalization. If the implementation reveals a docs mismatch or any dependency task lands conflicting route conventions, stop and report instead of widening scope.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
TASK-3.7 remains a future task. No implementation should be considered active until TASK-3.6 is genuinely complete and the submission/judging route placement can be confirmed against the settled API tree.

Current-state note: the recorded plan is still the baseline, but older planning notes that described the task as actively blocked on route seams are stale status commentary rather than current execution state. When TASK-3.7 starts, re-check the live `server/api` placement and the finalized BDD/auth harness before coding.
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
