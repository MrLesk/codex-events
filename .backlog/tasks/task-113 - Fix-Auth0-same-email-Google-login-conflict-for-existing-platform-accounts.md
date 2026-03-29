---
id: TASK-113
title: Fix Auth0 same-email Google login conflict for existing platform accounts
status: Done
assignee:
  - Codex
created_date: '2026-03-29 22:55'
updated_date: '2026-03-29 23:14'
labels: []
dependencies: []
documentation:
  - docs/domain-model.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Ensure a user who already has a platform account can sign in with Google using the same verified email address without hitting platform account email-conflict during account completion. The canonical outcome is one usable platform account per person, regardless of whether they authenticate through the database connection or Google.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 An existing platform user with a verified database-backed Auth0 identity can authenticate with Google using the same email address and reach the existing platform account instead of a duplicate-registration conflict.
- [x] #2 The fix does not allow linking or takeover when the social identity email is unverified.
- [x] #3 Auth0 bootstrap/configuration changes needed for local, dev, and production tenants are managed in repository code and can be applied repeatably.
- [x] #4 Automated tests cover the identity-conflict path and the chosen linking behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a dedicated same-email identity-linking flow that preserves the existing platform account subject as the canonical account.
2. Change account registration conflict handling so a verified social identity with an existing email can surface a link-required response instead of a dead-end conflict.
3. Add short-lived server-side linking challenge routes and a custom Auth0 reauthentication callback for the existing database connection.
4. Link the current social identity to the existing Auth0 account through the Auth0 Management API only after explicit reauthentication.
5. Add focused regression tests for conflict detection, challenge validation, and successful link completion.
6. Update repo-managed Auth0/runtime configuration and docs needed to support the flow without deploying or applying tenant changes in this task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
User approved implementation with an explicit constraint: do not deploy or apply any production/Auth0 tenant changes from this task; finish with commit and push only.

Implemented a user-confirmed Auth0 account-linking flow for verified same-email social identities. Registration now returns `platform_account_link_required`, issues a short-lived signed linking challenge cookie, and routes the user through explicit password reauthentication before linking the social identity to the existing Auth0 primary account.

Added custom `/auth/link/login` and `/auth/link/callback` routes, runtime Auth0 linking config, and `/account/register` UI handling for link-required and link-error states. The callback always returns through `/account/register` so existing platform-consent rules remain canonical.

Validation: `bun run typecheck` passed, `bun run test:unit` passed, targeted route coverage passed (`tests/unit/server/routes/auth/account-linking.test.ts`, `tests/integration/server/api/actor-platform-routes.test.ts`, `tests/unit/tools/auth0/auth0-bootstrap.test.ts`). `bun run test:integration` hit unrelated Miniflare/D1 `EADDRNOTAVAIL` socket failures in existing judging/submission suites; rerunning `tests/integration/server/api/judging-routes.test.ts` alone passed, which indicates an infrastructure flake rather than an auth-link regression.

No Auth0 tenant changes, Cloudflare changes, or production deployments were applied because the site is under change freeze. Operators still need to add the new runtime secrets and apply the bootstrap callback URL drift fix after the freeze.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented a same-email account-linking flow for Auth0 social logins without weakening the canonical platform account model. When a verified Google identity hits an existing platform-account email, registration now responds with `platform_account_link_required`, issues a short-lived signed link challenge, and sends the user through explicit password reauthentication against the configured Auth0 database connection before linking the social identity to the existing primary Auth0 subject.

The app now includes dedicated `/auth/link/login` and `/auth/link/callback` routes, a new `server/utils/platform-account-linking.ts` helper for signed challenges and Auth0 Management API linking, and `/account/register` UI states for link-required and link-error flows. Runtime config and operator docs were updated for the new Auth0 Management API, database connection, challenge secret, and callback URL requirements, and the Auth0 bootstrap now treats `/auth/link/callback` as part of the canonical allowed callback set.

Tests added and updated: route-level account-linking coverage, registration conflict integration coverage for verified and unverified social identities, and existing bootstrap coverage remained green. Validation completed with `bun run typecheck`, `bun run test:unit`, and targeted integration/route runs. Full `bun run test:integration` is currently affected by unrelated Miniflare/D1 `EADDRNOTAVAIL` flakes in existing suites, so that instability is recorded here rather than attributed to this change.
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
