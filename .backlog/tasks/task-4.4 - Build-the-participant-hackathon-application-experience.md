---
id: TASK-4.4
title: Build the participant hackathon application experience
status: Done
assignee:
  - Codex
created_date: '2026-03-22 22:09'
updated_date: '2026-03-23 18:11'
labels:
  - frontend
  - ui
  - participant
  - applications
milestone: m-1
dependencies:
  - TASK-3
  - TASK-4.3
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
Create the participant application workflow so a user can apply to a hackathon, satisfy required-profile rules, accept the correct application terms version, and track the application outcome before team formation. This is the canonical entry into hackathon participation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A user can view their application status for a hackathon and submit an application only when the hackathon is in `registration_open`.
- [x] #2 The application UI enforces required-profile and exact-version application-terms acceptance requirements from the canonical docs.
- [x] #3 The UI clearly distinguishes submitted, approved, and rejected application states and the actions available in each state.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend `app/pages/hackathons/[slug].vue` with an authenticated participant application panel while preserving the page as the canonical public-to-participant entry surface.
2. Add a bounded participant-application composable/helper layer for this task to resolve the current actor from `/api/session`, resolve the caller-visible hackathon id by matching the current slug against paginated `/api/hackathons` results, fetch `/api/hackathons/:hackathonId/applications/me`, fetch `/api/hackathons/:hackathonId/terms/current`, and derive missing required profile fields from the current platform profile plus the existing required-profile presentation logic.
3. Render explicit application states for signed-out, authenticated-without-platform-account, blocked-missing-profile-fields, open-registration submit flow with exact-version terms acceptance, existing submitted/approved/rejected statuses, and read-only closed-registration messaging.
4. Reuse existing onboarding/account form patterns and surface server error messages from the canonical application APIs instead of duplicating business rules in the client.
5. Add focused validation for the participant application slice only: task-local helper unit coverage if needed plus authenticated BDD scenarios for UI application submission, blocked required-profile state, and reviewed application status presentation using deterministic fixtures.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Supervisor opening TASK-4.4 as an unblocked Milestone 1 slice. Dedicated worker will read canonical docs and backlog workflow, run context-hunter, and return a discovery brief plus implementation plan for approval before any code changes.

Supervisor approved the TASK-4.4 implementation direction. Worker may now implement within that scope, update tests/docs as needed, and keep the write set bounded to the participant application slice.

Supervisor review found no actionable TASK-4.4 findings after the SSR auth-fetch fix and authenticated browser validation pass.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added the participant application panel to the public hackathon detail route with explicit signed-out, authenticated-without-platform-account, missing-profile, open-registration submit, and reviewed application states. Added a task-local participant application composable and helper utilities to resolve the current actor on the client, map the visible hackathon slug to its internal id, load the caller's own application and current application terms, and submit the exact current terms version. Added deterministic participant application fixtures plus focused unit and authenticated BDD coverage for submission, required-profile gating, and approved/rejected status display.

Validation completed for this task slice with `bunx eslint 'app/pages/hackathons/[slug].vue' app/composables/useParticipantApplication.ts app/utils/participant-application.ts tests/unit/app/utils/participant-application.test.ts tests/bdd/steps/participant-application.steps.ts tests/bdd/support/platform-fixtures.ts`, `bunx vitest run tests/unit/app/utils/participant-application.test.ts`, `node --experimental-strip-types tests/bdd/bootstrap.ts`, `./node_modules/.bin/bddgen`, and `bunx playwright test tests/bdd/features/authenticated/participant-application.feature --project chromium-authenticated-bdd`. Canonical docs were reviewed and remained unchanged. Residual risk: full repository `bun run typecheck` is currently blocked by concurrent in-progress TASK-4.10 changes outside the TASK-4.4 slice.
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
