---
id: TASK-342
title: Show unverified email guidance before account registration submit
status: Done
assignee:
  - codex
created_date: '2026-05-31 17:30'
updated_date: '2026-05-31 17:33'
labels:
  - account
  - ui
dependencies: []
modified_files:
  - app/composables/useSessionActor.ts
  - app/domains/accounts/session-actor.ts
  - app/domains/accounts/registration.ts
  - app/domains/teams/workspace.ts
  - app/pages/account/register.vue
  - tests/unit/app/domains/accounts/registration.test.ts
priority: medium
ordinal: 45000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When an authenticated identity reaches /account/register with an email address that is not verified by the sign-in provider, show the user a clear up-front message instead of waiting until they accept platform documents and submit the form.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The account-registration page can read the identity email verification state from the typed session actor.
- [x] #2 An unverified authenticated identity sees guidance to confirm their email when /account/register loads.
- [x] #3 The page does not require accepting Privacy Policy and Platform Terms before surfacing the unverified-email block.
- [x] #4 Registration submission remains blocked for unverified identities, matching the existing server-side registration guard.
- [x] #5 Relevant tests cover the new copy and typed unverified-email state.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add email_verified to the typed frontend session user identity and local fallback actor shape.
2. Add account-registration copy for the unverified-email state so the page can show clear up-front guidance.
3. Update /account/register.vue to detect authenticated identities with email_verified !== true, show the guidance alert on load, and disable/block submit before document acceptance can matter.
4. Add focused unit tests for the new copy/state, then run lint, typecheck, unit tests, and integration tests because this touches account registration behavior.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented by typing and preserving Auth0 email_verified in frontend session actors, adding account-registration copy for unverified identities, and rendering a standalone email-confirmation state before the legal document acceptance form. Submit handlers still guard unverified identities, matching the existing server-side registration guard.

Validation: bun run lint passed; bun run typecheck passed; bun run test:unit passed; bun run test:integration passed; git diff --check passed. bun run test:bdd was attempted and remains blocked during fixture bootstrap by existing judge_criterion_scores fixture values outside the current 1-5 schema constraint.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added upfront unverified-email handling on /account/register. Authenticated identity session actors now preserve email_verified, and the registration page shows a standalone "Confirm your email to finish registration" message before rendering the legal document acceptance form when the identity email is unverified. The submit path remains blocked for unverified identities so the frontend behavior matches the existing server guard.

Updated account registration unit coverage for the confirmation copy and typed email verification state. Validation passed for lint, typecheck, unit tests, integration tests, and diff whitespace checks. BDD was attempted but remains blocked before browser execution by an existing fixture/schema mismatch: BDD fixture SQL inserts judge criterion scores outside the current 1-5 score constraint.
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
