---
id: TASK-4.11
title: Build winner-facing prize redemption and admin redemption visibility
status: Done
assignee:
  - Codex
created_date: '2026-03-22 22:09'
updated_date: '2026-03-23 19:13'
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
- [x] #1 Prize recipients can see their pending redemption tasks across hackathons and submit the required redemption data from the UI.
- [x] #2 The redemption flow requires legal name and exact-version acceptance of the current winner terms for the relevant hackathon.
- [x] #3 Admins can view redemption records and eligibility context without exposing that data to unauthorized users.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Replace the placeholder /prize-redemptions route with the real winner-facing task surface backed by /api/prize-redemptions/me and the authenticated current-terms endpoint for each visible hackathon.
2. Add a bounded prize-redemption helper/composable layer that normalizes pending tasks, exact current winner-terms acceptance state, legal-name submission state, and empty or unauthorized handling for both member-scoped and team-scoped redemptions.
3. Extend the admin competition workspace with a dedicated redemption visibility panel sourced from /api/hackathons/:hackathonId/prize-redemptions so admins can review winners and redemption records without exposing that data outside admin-only surfaces.
4. Reuse existing canonical APIs only and keep any admin redemption visibility inside the competition workspace rather than introducing a parallel admin route.
5. Add focused unit coverage plus authenticated BDD coverage for recipient redemption, exact-version winner-terms acceptance, and admin visibility or denial paths, updating fixtures/bootstrap only where required for this task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Supervisor-approved implementation plan recorded immediately before coding after local context discovery across the placeholder winner route, redemption APIs and utilities, admin competition workspace, and canonical docs.

Implemented the real winner-facing redemption workspace in `app/pages/prize-redemptions/index.vue` with the bounded `usePrizeRedemptionWorkspace` composable plus shared `app/utils/prize-redemptions.ts` helper layer, including exact current winner-terms loading, legal-name capture, and submit actions against the canonical redemption endpoint only.

Extended the admin competition surface with `app/components/admin/AdminCompetitionPrizeRedemptionsPanel.vue` and wired `app/pages/admin/hackathons/[hackathonId]/competition.vue` to load `/api/hackathons/:hackathonId/prize-redemptions` only after winners are visible so admins can review redemption progress without creating a parallel route.

Added focused coverage in `tests/unit/app/utils/prize-redemptions.test.ts`, `tests/bdd/features/authenticated/prize-redemptions.feature`, `tests/bdd/steps/prize-redemptions.steps.ts`, `tests/bdd/steps/admin-competition.steps.ts`, and fixture support in `tests/bdd/support/platform-fixtures.ts` with a dedicated mutable winner-facing fixture plus a read-only admin visibility record on the existing competition-complete fixture.

Validation passed: `bunx eslint` on the touched app and test files, `bunx nuxi typecheck`, `bunx vitest run tests/unit/app/utils/prize-redemptions.test.ts`, `node --experimental-strip-types tests/bdd/bootstrap.ts`, `./node_modules/.bin/bddgen`, and `bunx playwright test tests/bdd/features/authenticated/prize-redemptions.feature --project chromium-authenticated-bdd`.

Canonical docs remained unchanged for this task; implementation matched the existing docs and API surface.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented the winner-facing prize redemption workspace and admin redemption visibility inside the existing competition surface. The slice now supports pending task discovery, legal-name capture, exact current winner-terms acceptance, admin redemption oversight, and focused unit plus authenticated BDD coverage, validated with eslint, typecheck, focused vitest, BDD bootstrap, bddgen, and the prize-redemption Playwright feature.
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
