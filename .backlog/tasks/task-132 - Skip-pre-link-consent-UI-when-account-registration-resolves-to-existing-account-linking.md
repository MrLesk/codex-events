---
id: TASK-132
title: >-
  Skip pre-link consent UI when account registration resolves to
  existing-account linking
status: Done
assignee: []
created_date: '2026-03-31 17:40'
updated_date: '2026-03-31 17:45'
labels:
  - auth0
  - ux
  - account-linking
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/api-surface.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When an authenticated social identity matches an existing platform account and the app requires Auth0 account linking, the `/account/register` page currently shows the platform-consent banner and document checkboxes even though the registration endpoint throws `platform_account_link_required` before any acceptance is recorded. This makes the user complete a consent step that has no effect. Update the registration flow so link-required users are shown a link-only state instead of the platform-consent UI until the existing account is linked.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `/api/session` exposes enough authenticated-identity metadata for the registration page to know when the current user is in a same-email account-linking path
- [x] #2 The `/account/register` page hides the platform-consent banner, document sections, and Continue action when the current user is in a link-required state and instead shows the existing-account linking action
- [x] #3 `/auth/link/login` can start the linking flow for a valid same-email social identity even when no challenge cookie was pre-issued by the registration submit path
- [x] #4 Automated tests cover the link-required session metadata and the link-login start behavior without a pre-existing challenge cookie
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a reusable server-side helper that detects when the current authenticated identity is a verified same-email social login that must link to an existing password-backed platform account.
2. Surface a client-safe link-required hint on the authenticated-identity session payload returned by `/api/session`.
3. Update `/auth/link/login` so it can issue the short-lived linking challenge from the current authenticated identity when no challenge cookie already exists.
4. Update `/account/register` to enter a link-only UI mode that hides the platform-consent banner, document sections, and Continue action when the session payload indicates link-required state.
5. Add focused regression coverage for the new session payload and the challenge-less `/auth/link/login` path, then update canonical docs for the revised flow.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added a reusable server-side same-email link-candidate helper and exposed client-safe link metadata on authenticated-identity `/api/session` responses.

Updated `/auth/link/login` to auto-issue the short-lived linking challenge from the current authenticated social identity when no challenge cookie is already present.

Updated `/account/register` to enter a link-only mode that hides the platform-consent banner, document sections, and Continue action when linking is required, and adjusted the intro/linking error copy to match that flow.

Added unit coverage for the registration-page mode helper, route coverage for `/auth/link/login` without a pre-existing challenge cookie, and integration coverage for the new `/api/session` link metadata.

Updated canonical docs in `docs/domain-model.md` and `docs/api-surface.md` to state that pre-link identities do not record platform-document acceptance and that `/account/register` can bypass consent UI while resolving existing-account linking.

Validation: `bun x vitest run tests/unit/server/routes/auth/account-linking.test.ts` passed, `bun x vitest run --config vitest.integration.config.ts tests/integration/server/api/actor-platform-routes.test.ts` passed, `bun run typecheck` passed, `bun run test:unit` passed, and `bun run lint` passed with the existing repo `vue/no-v-html` warnings only.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated the same-email Auth0 account-linking flow so `/account/register` can enter a link-only mode before the user submits any platform-document consent. Authenticated social identities that match an existing password-backed platform account now receive a client-safe link hint through `/api/session`, `/auth/link/login` can bootstrap its own short-lived linking challenge without a pre-issued cookie, and the registration page hides the consent banner, legal document sections, and Continue action while linking is required.

Added a small account-registration UI helper, updated the account-link route and actor/session plumbing, and aligned the canonical docs to state that pre-link identities do not record platform-document acceptance. Added regression coverage for the new session metadata, the challenge-less `/auth/link/login` path, and the registration-page mode helper.

Validation: `bun run lint` passed with the existing repo `vue/no-v-html` warnings only, `bun run typecheck` passed, `bun run test:unit` passed, `bun x vitest run tests/unit/server/routes/auth/account-linking.test.ts` passed, and `bun x vitest run --config vitest.integration.config.ts tests/integration/server/api/actor-platform-routes.test.ts` passed.
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
