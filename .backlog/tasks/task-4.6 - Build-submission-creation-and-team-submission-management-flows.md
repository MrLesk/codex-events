---
id: TASK-4.6
title: Build submission creation and team submission management flows
status: Done
assignee:
  - Codex
created_date: '2026-03-22 22:09'
updated_date: '2026-03-23 19:12'
labels:
  - frontend
  - ui
  - participant
  - submissions
milestone: m-1
dependencies:
  - TASK-3
  - TASK-4.5
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
Create the team-owned submission experience so team admins can create, edit, submit, and withdraw project submissions during the canonical submission window, while team members can monitor submission status across the documented workflow states.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Team admins can create and edit a draft submission, submit it, and withdraw it only during the lifecycle states where those actions are allowed.
- [x] #2 The UI reflects the difference between no submission, draft submission, submitted submission, locked submission, withdrawn submission, and disqualified submission.
- [x] #3 Team members can view their team submission status and the UI prevents post-lock editing or withdrawal once the documented guard has passed.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend the participant team workspace to load the current team submission and surface submission status for every team member from the existing hackathon/team route context rather than creating a separate participant area.
2. Add a bounded team-submission helper/composable layer that fetches the current submission, derives canonical action availability and reasons for no-submission, draft, submitted, withdrawn, locked, and disqualified states, and normalizes submission form payloads and API errors.
3. Build reusable participant submission UI for create/edit, submit, withdraw, and read-only member status summaries using the existing Nuxt UI card and form patterns already used in the participant and admin workspaces.
4. Wire only the existing canonical submission endpoints: GET/POST/PATCH /submission plus submit and withdraw actions, leaving admin-only withdrawal/disqualification in the admin operations workspace.
5. Add focused unit coverage for derived submission policies plus authenticated BDD coverage for create, edit, submit, withdraw, and post-lock visibility paths, updating fixtures/bootstrap only as needed for this task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Supervisor-approved implementation plan recorded immediately before coding after local context discovery across the participant team workspace, submission APIs, admin operations analogs, and canonical docs.

Implemented participant team submission management inside the existing team workspace route with the bounded helper/composable layer in `app/utils/team-submission.ts` and `app/composables/useTeamSubmissionWorkspace.ts`, the new `ParticipantTeamSubmissionPanel.vue`, and task-specific unit plus authenticated BDD coverage. Validation passed with targeted `bunx eslint`, `bunx nuxi typecheck`, `bunx vitest run tests/unit/app/utils/team-submission.test.ts tests/unit/support/bdd/platform-fixtures.test.ts`, `node --experimental-strip-types tests/bdd/bootstrap.ts`, `./node_modules/.bin/bddgen`, and `bunx playwright test tests/bdd/features/authenticated/team-submission.feature --project chromium-authenticated-bdd` after a clean fixture reset.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented the participant team submission workspace inside the hackathon-scoped team route, including draft creation, edit/save, submit, withdraw, canonical status summaries, and read-only post-lock visibility. Added task-specific helper/composable layers plus unit and authenticated BDD coverage, and validated the slice with eslint, typecheck, focused vitest, BDD bootstrap, bddgen, and the participant submission Playwright feature.
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
