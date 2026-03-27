---
id: TASK-34
title: Implement hackathon-admin registration approval flow
status: Done
assignee:
  - '@codex'
created_date: '2026-03-27 02:06'
updated_date: '2026-03-27 07:14'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Enable hackathon admins to review submitted participant registrations and record approve/reject outcomes through the admin operations workspace, using canonical application state transitions and role guards.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Hackathon admins can open the admin operations workspace for a manageable hackathon and see submitted participant applications.
- [x] #2 Hackathon admins can approve a submitted application and the UI reflects the updated approved state after the action.
- [x] #3 Hackathon admins can reject a submitted application and the UI reflects the updated rejected state after the action.
- [x] #4 End-to-end or integration coverage exercises the hackathon-admin approval path and validates the expected state transition.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add authenticated BDD coverage for hackathon-admin application approval by creating an admin-operations feature that uses existing admin operations step definitions.
2. Add or adjust integration API coverage so hackathon-admin rejection of a submitted application is explicitly validated.
3. Run validation for changed behavior: targeted application integration test and full unit suite (`bun run test:unit`).
4. Update task notes/criteria to reflect completed coverage and confirm canonical docs remain unchanged.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added a new authenticated BDD feature (`tests/bdd/features/authenticated/admin-operations.feature`) to exercise hackathon-admin application review actions from the admin operations workspace.

Extended admin BDD step definitions with an explicit reject action step and seeded a second submitted fixture application so approve/reject scenarios are independent.

Added integration coverage proving hackathon-admin actors can reject submitted applications (`tests/integration/server/api/application-routes.test.ts`).

Validation: `bun run test:integration tests/integration/server/api/application-routes.test.ts`, `bun run test:unit`, and `bunx bddgen` all passed.

Follow-up validation via `bun run test:bdd` exposed a middleware-context regression in `app/utils/navigation-guards.ts` that affected hackathon-admin slug-route guards during SSR. Fixed by resolving `navigationFetch` once per guard invocation and reusing it across awaited calls.

Adjusted admin-operations BDD assertions to match current UI output: scenario text now checks for `Admin Operations`, and status badge matching is now case-insensitive in `tests/bdd/steps/admin-operations.steps.ts`.

Revalidation after fixes: `bun tests/bdd/bootstrap.ts`, `bunx bddgen`, and targeted Playwright run for `.features-gen/authenticated/tests/bdd/features/authenticated/admin-operations.feature.spec.js` on `chromium-authenticated-bdd` all passed.

Full authenticated BDD suite still reports a separate existing failure in `admin-configuration.feature` (`background image endpoint should return uploaded image`), outside this task scope.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented and validated the hackathon-admin registration approval flow coverage.

Changes made:
- Added a dedicated authenticated BDD feature for admin application review in the operations workspace (`tests/bdd/features/authenticated/admin-operations.feature`).
- Added a reject action step to admin operations BDD steps (`tests/bdd/steps/admin-operations.steps.ts`).
- Seeded an additional submitted fixture application so approval and rejection scenarios can run independently (`tests/bdd/support/platform-fixtures.ts`).
- Extended integration tests to explicitly verify that hackathon-admin users can reject submitted applications (`tests/integration/server/api/application-routes.test.ts`).

Validation run:
- `bun run test:integration tests/integration/server/api/application-routes.test.ts`
- `bun run test:unit`
- `bunx bddgen`

Docs impact:
- Canonical docs were confirmed unchanged for this task.

Risks/follow-ups:
- Full Auth0-backed browser execution (`bun run test:bdd`) was not run in this task session; BDD generation passed and step bindings compile.

Follow-up stabilization fixed a SSR middleware context issue in `app/utils/navigation-guards.ts` that blocked hackathon-admin operations routes under BDD execution. The guard now reuses a single fetch resolver across awaits.

Admin-operations BDD assertions were aligned with current UI text/status formatting, and the targeted admin-operations authenticated feature now passes end-to-end.
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
