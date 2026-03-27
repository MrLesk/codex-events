---
id: TASK-33
title: Implement participant hackathon registration submission flow
status: Done
assignee:
  - '@codex'
created_date: '2026-03-27 01:58'
updated_date: '2026-03-27 02:12'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Enable authenticated platform users to register for a hackathon from the participant-facing experience by submitting their UserApplication against the current application terms. The flow should clearly handle eligibility requirements and current application status so users can proceed to team formation once approved, without mixing in admin approval actions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Authenticated platform users can start registration from the hackathon detail experience and submit an application when registration is open.
- [x] #2 The registration submission UI requires explicit acceptance of the current application terms and uses the exact current application terms document ID when calling the API.
- [x] #3 Users can choose a registration team-size intent (`solo`, `team`, `unknown`); when `team` is selected the UI exposes up to `maxTeamMembers` teammate hint rows with free-form identity input.
- [x] #4 The submitted registration stores team-size intent and teammate hints as a JSON string on the corresponding `UserApplication` record.
- [x] #5 If required profile fields are missing, the UI blocks submission and clearly lists missing fields with a path to account settings.
- [x] #6 Existing application states (submitted, approved, rejected) are shown with clear status messaging and participant-appropriate next actions.
- [x] #7 Relevant unit/integration tests are added or updated for the new registration payload and persistence behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Integrate participant registration workspace state into `app/pages/hackathons/[slug]/index.vue` by invoking `useParticipantApplication(hackathon, slug)` for authenticated routes.
2. Introduce a participant registration panel component under `app/components/public/hackathons/` to render apply-state UX for platform users: registration availability, terms acceptance checkbox, submit action, and error/success feedback.
3. Implement state-aware messaging and actions for existing applications (`submitted`, `approved`, `rejected`), including participant navigation to team workspace when approved.
4. Surface required-profile gating in the panel using missing-field data and a direct link to account settings.
5. Add/update unit tests for new participant-registration helper behavior and run `bun run test:unit` to validate changes.

Scope expanded per user request: capture registration team-intent (`solo`/`team`/`unknown`) and optional teammate hints, persist as JSON string on `UserApplication`, and expose this in participant registration API/UI flow.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented participant registration submission UI on hackathon detail page using `useParticipantApplication` and new `HackathonRegistrationPanel` component.

Added registration team-intent and teammate-hint capture in UI; when intent is `team`, the form renders up to hackathon `maxTeamMembers` hint rows.

Extended `POST /api/hackathons/:hackathonId/applications` payload validation and persistence to include registration details, serialized into `registration_details_json` on `user_applications`.

Added migration `drizzle/0008_user_application_registration_details.sql` and updated Drizzle schema.

Updated canonical docs (`docs/domain-model.md`, `docs/schema-outline.md`, `docs/api-surface.md`) to reflect new registration intent/hints model.

Validation run: `bun run test:unit` (pass), `bun run test:integration -- tests/integration/server/api/application-routes.test.ts` (pass), `bun run typecheck` (pass).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented participant-side hackathon registration submission end-to-end, including new registration intent hints.

What changed:
- Wired the participant application workspace into the hackathon detail page (`app/pages/hackathons/[slug]/index.vue`) so authenticated platform users can submit applications during `registration_open`.
- Added `HackathonRegistrationPanel` (`app/components/public/hackathons/HackathonRegistrationPanel.vue`) with:
  - status-aware application UI for `submitted` / `approved` / `rejected`
  - explicit current-terms acceptance gate
  - required-profile blocking + account-settings path
  - team-intent selector (`solo` / `team` / `unknown`)
  - teammate hint rows up to `maxTeamMembers` when `team` is selected.
- Extended participant-side models/helpers (`app/utils/participant-application.ts`, `app/composables/useParticipantApplication.ts`) for submission policy, team hint normalization, and registration-details parsing utilities.

Backend/data changes:
- Added `registration_details_json` to `user_applications` in Drizzle schema (`server/database/schema.ts`) and migration (`drizzle/0008_user_application_registration_details.sql`).
- Extended application submit payload/validation and persistence (`server/utils/applications.ts`, `server/api/hackathons/[hackathonId]/applications/index.post.ts`) to store registration hints as JSON string in `registration_details_json`.
- API serialization now includes `registrationDetailsJson` on `UserApplication` responses.

Docs updates:
- Updated canonical docs to include registration team-intent and teammate hints:
  - `docs/domain-model.md`
  - `docs/schema-outline.md`
  - `docs/api-surface.md`

Tests/validation:
- Updated/added unit coverage:
  - `tests/unit/app/utils/participant-application.test.ts`
  - `tests/unit/server/utils/applications.test.ts`
- Updated integration coverage:
  - `tests/integration/server/api/application-routes.test.ts` (persistence + validation for max-team-member hints)
- Validation run and passing:
  - `bun run test:unit`
  - `bun run test:integration -- tests/integration/server/api/application-routes.test.ts`
  - `bun run typecheck`

Risks/follow-ups:
- `registration_details_json` is currently stored and returned but not yet used by admin approval UX/workflows (intentionally separated; a different agent is handling approval flow).
- Unrelated local untracked files (`TASK-34`, `tests/bdd/features/authenticated/admin-operations.feature`) were left untouched.
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
