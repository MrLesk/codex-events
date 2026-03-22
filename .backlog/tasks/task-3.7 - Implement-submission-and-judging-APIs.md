---
id: TASK-3.7
title: Implement submission and judging APIs
status: Done
assignee:
  - '@codex'
created_date: '2026-03-22 18:55'
updated_date: '2026-03-22 23:09'
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
- [x] #1 Team admins can manage submissions only in the documented lifecycle states, including submit and withdraw behaviors before judging preparation begins, and the backend exposes the documented no-submission team section data needed for operational views.
- [x] #2 Judging preparation and active review follow the documented blind-review, assignment, scoring, ineligibility, skip, reassignment, and disqualification rules.
- [x] #3 Automated tests for this API area include unit and integration coverage plus Auth0-backed end-to-end scenarios for submission locking, visibility restrictions, review-state guards, reassignment behavior, no-submission derived reads, and audit-relevant actions.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Preserve the completed submission and no-submission slice, then restore the missing judging helper module under `server/utils/judging.ts` so the existing lifecycle start routes compile and enforce the documented preparation and review guards.
2. Implement the remaining judging assignment route tree under `server/api/hackathons/[hackathonId]/judging/assignments`, reusing assignment authorization for blind access and adding helper functions for list/detail shaping, start, complete, skip, mark-ineligible, reassign, force-skip, and revert-ineligibility.
3. Extend unit and integration coverage for judging lifecycle and assignment workflows, including blind visibility, unstarted-only reassignment, low-load redistribution on skip, ineligibility transitions, and audit-relevant admin actions.
4. Update canonical docs so admin withdrawal on team request explicitly requires `requestedByUserId` for an active team admin, then add Auth0-backed BDD coverage for submission, judge review, and admin intervention flows.
5. Run targeted validation first, then full task validation, and finalize the task record with checked acceptance criteria, current plan, implementation notes, and final summary for review.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
TASK-3.7 is complete. The submission routes, no-submission operational read model, judging lifecycle start routes, full judging assignment route tree, and blind-review helper layer now match the canonical docs. Canonical docs were updated to make admin withdrawal on team request explicitly require `requestedByUserId` for an active team admin. Auth0-backed BDD coverage now includes judge completion and admin force-skip intervention on a dedicated judging fixture hackathon.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented the remaining TASK-3.7 backend surface for submissions and judging. Added `server/utils/judging.ts`, the full `server/api/hackathons/[hackathonId]/judging/assignments` route tree, focused assignment integration coverage, and Auth0-backed BDD judging scenarios using a dedicated judging fixture. Updated canonical docs to make the admin-withdraw `requestedByUserId` contract explicit. Validation passed with `bunx vitest run tests/unit/server/utils/submissions.test.ts tests/unit/server/utils/judging.test.ts`, `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/submission-routes.test.ts tests/integration/server/api/hackathon-routes.test.ts tests/integration/server/api/judging-routes.test.ts`, `bunx bddgen`, `bun run test:bdd`, `bun run lint`, and `bun run typecheck`. Follow-up risk is low and now shifts to TASK-3.8 consuming the judging outputs for shortlist, winners, prize redemption, and audit reads without breaking the blind-review assumptions already encoded here.
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
