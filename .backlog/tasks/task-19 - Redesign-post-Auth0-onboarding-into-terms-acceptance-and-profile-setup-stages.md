---
id: TASK-19
title: Redesign post-Auth0 onboarding into terms acceptance and profile setup stages
status: Done
assignee:
  - codex
created_date: '2026-03-24 21:21'
updated_date: '2026-03-24 21:42'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refactor the current platform registration flow so an authenticated Auth0 user is guided through onboarding after login instead of combining document acceptance, Auth0 redirect intent, and profile capture in a single registration screen. The new flow should track whether the user has completed the terms-acceptance onboarding step, require privacy policy and platform terms acceptance when missing, and then send the user to a second onboarding page for platform profile fields such as display name, social profiles, ChatGPT email, OpenAI org ID, and Luma username. The second onboarding page should closely match the existing account settings experience while remaining appropriate for first-time onboarding. Update the canonical docs and automated coverage to reflect the new onboarding model.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Authenticated users who have not completed the onboarding terms step are routed to the terms-acceptance onboarding flow after Auth0 login instead of being treated as fully onboarded.
- [x] #2 After completing the required privacy policy and platform terms acceptance, the user is sent to a second onboarding page to complete or confirm their platform profile fields.
- [x] #3 The second onboarding page reuses or closely matches the current account settings profile-editing experience for the supported platform profile fields.
- [x] #4 Session and actor resolution expose enough onboarding state for the frontend to route users correctly without relying only on platform-account existence.
- [x] #5 The redesigned flow preserves exact-version platform document acceptance behavior and records the required acceptance data correctly.
- [x] #6 Canonical documentation and automated tests covering onboarding, account lifecycle, and related routing are updated to match the new flow.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add persistent onboarding state for platform users in the schema and migration layer, then update account-management utilities so initial post-Auth0 registration creates a platform user with explicit onboarding progress and exact-version acceptance handling.
2. Extend session and actor responses to expose onboarding state, and update auth/account navigation logic so authenticated users are routed by onboarding stage rather than only by platform-account existence.
3. Split the current combined auth access flow into a terms-acceptance step and a second onboarding profile step, reusing the existing account settings profile-editing UI patterns for the profile stage.
4. Update account settings and related frontend composables/types to work with the new onboarding state without regressing existing account lifecycle behavior.
5. Update canonical docs plus unit, integration, and BDD coverage for onboarding, account lifecycle, and session/routing behavior; then run targeted validation and broader relevant checks.

6. Remove the unnecessary anonymous `/auth/access` pre-auth wrapper state by routing signed-out users directly to Auth0 and simplifying the auth access page to terms-pending only.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented a two-step post-Auth0 onboarding flow by treating authenticated identities without a platform user as `terms_pending` and persisting platform-user onboarding state as `profile_pending` or `completed`.

Refactored `/auth/access` into the exact-version platform document acceptance step, added a real `/onboarding/account` profile-completion page, and reused a shared profile form component with the account settings page.

Updated session actor serialization and route guards so protected routes redirect incomplete users into the required onboarding step instead of relying only on platform-account existence.

Validation run: `bun run typecheck`, `bun run lint`, `bun run test:unit tests/unit/app/utils/auth-navigation.test.ts tests/unit/server/auth/actor.test.ts tests/unit/server/database/schema.test.ts tests/unit/server/utils/account-management.test.ts`, and `bun x vitest run --config vitest.integration.config.ts tests/integration/server/api/actor-platform-routes.test.ts`.

Test gap: the full Auth0-backed BDD suite (`bun run test:bdd`) was not run in this pass because it depends on the local Auth0 E2E configuration and is materially heavier than the targeted route and unit coverage used here.

Follow-up scope change approved by user: remove the redundant anonymous pre-auth access wrapper and simplify routing so anonymous users go straight to Auth0 while `/auth/access` remains only for the post-Auth0 terms-pending state.

Removed the redundant anonymous pre-auth wrapper from `/auth/access`. Anonymous users now go straight to Auth0, while `/auth/access` is reserved for the post-Auth0 terms-acceptance step only.

Simplified auth navigation helpers by separating direct Auth0 login from terms onboarding links, and updated public/register CTAs plus protected-route guards accordingly.

Follow-up validation run: `bun run typecheck`, `bun run lint`, the same targeted unit suite, and the targeted actor/account integration suite all passed after the cleanup.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented a real two-step post-Auth0 onboarding flow for platform users. The backend now persists `users.onboarding_state` (`profile_pending` or `completed`) and exposes onboarding metadata through `/api/session`, while authenticated identities without a platform user remain the implicit `terms_pending` stage. `POST /api/account/registration` now creates the platform user only after exact acceptance of the current platform documents, and `PATCH /api/account` completes onboarding when the profile step is first saved.

On the frontend, `/auth/access` is now the terms-acceptance step instead of a combined pre-auth registration form, `/onboarding/account` is the new second-step profile page, and protected route guards now redirect incomplete users into the correct onboarding stage. The profile form was shared with account settings so the second onboarding page closely matches the ongoing account-editing experience.

Updated canonical docs (`domain-model`, `api-surface`, `lifecycle-and-state-machines`, `schema-outline`) and refreshed unit, integration, and BDD coverage for the new onboarding contract. Validation completed with `bun run typecheck`, `bun run lint`, targeted unit tests, and the targeted integration suite for actor/account routes. The full Auth0-backed BDD suite was not run in this pass; that remains the main follow-up validation risk if you want an end-to-end browser confirmation.

Follow-up cleanup removed the remaining anonymous pre-auth wrapper state. `/auth/access` now serves only authenticated identities in the terms-acceptance step, header sign-in and anonymous guards now go directly to Auth0, and anonymous registration CTAs explicitly start Auth0 and then return into the terms step.
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
