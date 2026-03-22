---
id: TASK-3.8
title: 'Implement shortlist, winner, prize redemption, and audit APIs'
status: Done
assignee:
  - '@codex'
created_date: '2026-03-22 18:55'
updated_date: '2026-03-22 23:27'
labels:
  - backend
  - api
  - prizes
  - audit
milestone: m-0
dependencies:
  - TASK-3.1
  - TASK-3.2
  - TASK-3.3
  - TASK-3.4
  - TASK-3.5
  - TASK-3.7
documentation:
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/permissions-matrix.md
  - docs/schema-outline.md
parent_task_id: TASK-3
priority: high
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the backend APIs that cover the end of the hackathon workflow after judging. This work must expose the computed leaderboard, shortlist and ranking review process, support winner announcement and prize redemption requirements, and provide the restricted audit access needed for operational review.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The backend exposes the documented computed leaderboard, shortlist, and winner workflows, including admin-controlled final ranking actions without changing underlying judge scores.
- [x] #2 Prize eligibility and redemption behavior follow the documented freeze point, recipient requirements, and exact-version winner-terms acceptance requirements.
- [x] #3 Automated tests for this API area include unit and integration coverage plus Auth0-backed end-to-end scenarios for leaderboard and shortlist visibility, winner and prize actions, and operational audit access.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Implement computed leaderboard and shortlist read models plus shortlist reorder support, reusing the judging outputs without mutating underlying judge scores.
2. Implement winner announcement and public winner visibility routes with lifecycle guards aligned to shortlist and winners_announced states.
3. Implement prize-redemption operational reads and recipient redemption flows, enforcing frozen eligibility snapshots, legal-name capture, and exact-version winner-terms acceptance.
4. Implement restricted audit read APIs for hackathon-scoped and platform-wide operational review.
5. Add focused unit and integration coverage for shortlist ordering, winner visibility, redemption rules, and audit access, then add Auth0-backed end-to-end coverage for leaderboard/shortlist visibility, prize redemption, and admin audit access.
6. Run full validation, finalize the backlog task, and create a dedicated TASK-3.8 commit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
TASK-3.8 started after TASK-3.7 completion and commit `ca3c549`. Read-in confirms the remaining scope is limited to computed leaderboard and shortlist APIs, winner announcement and visibility, prize-redemption operations, and restricted audit reads. Implementation must preserve the canonical rule that shortlist ordering is computed and manually reordered without mutating underlying judge scores, and prize redemption must bind to the exact accepted winner-terms version.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented the full TASK-3.8 backend surface for computed leaderboard, shortlist, winners, prize redemption, and restricted audit reads. Added shortlist and prize-redemption helper layers plus routes for start-shortlist, shortlist listing and reorder, winners announcement, winner visibility, prize-redemption operational reads, recipient redemption, and hackathon/platform audit access. Updated canonical docs to add the missing start-shortlist API entry and to clarify that team-scoped redemptions are completed by active team admins while member-scoped redemptions are completed by the eligible user. Added focused unit and integration coverage plus an Auth0-backed outcomes BDD scenario that exercises shortlist reorder, winner announcement and visibility, team-scoped redemption, and both audit surfaces. Validation passed with bunx vitest run tests/unit/server/utils/shortlist.test.ts tests/unit/server/utils/prize-redemptions.test.ts, bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/outcome-routes.test.ts, bunx bddgen, bun run lint, bun run typecheck, and bun run test:bdd. Residual risk is limited to the intentional audit-log-backed shortlist ordering design, which remains covered by integration and end-to-end tests; no additional follow-up is required within TASK-3.8.
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
