---
id: TASK-321
title: Replace app-runtime Auth0 account linking with Auth0 Action flow
status: Done
assignee: []
created_date: '2026-05-27 20:29'
updated_date: '2026-05-27 20:52'
labels:
  - auth0
  - account-linking
  - security
dependencies: []
documentation:
  - >-
    https://auth0.com/docs/manage-users/user-accounts/user-account-linking/link-user-accounts
  - >-
    https://auth0.com/docs/customize/actions/triggers/post-login/redirect-with-actions
modified_files:
  - .env.example
  - .github/workflows/ci.yml
  - .github/workflows/release-production.yml
  - DEVELOPMENT.md
  - OPERATOR.md
  - app/domains/accounts/registration.ts
  - app/domains/accounts/session-actor.ts
  - app/pages/account/register.vue
  - docs/api-surface.md
  - docs/domain-model.md
  - docs/security-analysis.md
  - nuxt.config.ts
  - server/api/account/registration.post.ts
  - server/api/session.get.ts
  - server/auth/actor.ts
  - server/domains/accounts/index.ts
  - server/domains/accounts/linking.ts
  - server/routes/auth/link/callback.ts
  - server/routes/auth/link/complete.ts
  - server/routes/auth/link/login.ts
  - server/types/h3.d.ts
  - tests/bdd/support/auth0-management.ts
  - tests/bdd/support/personas.ts
  - tests/integration/server/api/actor-platform-routes.test.ts
  - tests/unit/app/domains/accounts/registration.test.ts
  - tests/unit/app/domains/events/staff-dashboard.test.ts
  - tests/unit/server/auth/actor.test.ts
  - tests/unit/server/domains/accounts/linking.test.ts
  - tests/unit/server/routes/auth/account-linking.test.ts
  - tests/unit/support/bdd/auth0-management.test.ts
  - tests/unit/support/bdd/personas.test.ts
  - tests/unit/tools/auth0/auth0-bootstrap.test.ts
  - tests/unit/tools/deploy/generate-wrangler-config.test.ts
  - tools/auth0/auth0-bootstrap.ts
  - tools/auth0/auth0-custom-domain.ts
  - tools/deploy/generate-wrangler-config.ts
priority: high
ordinal: 24000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Move platform account linking out of normal app runtime. Account linking should be driven by the Auth0 post-login flow and a dedicated linking callback so deployed app environments do not carry Auth0 Management API credentials for user traffic. The implementation should use the canonical variable names only and avoid compatibility fallbacks for old Management API runtime settings.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Auth0 account linking no longer requires NUXT_AUTH0_MANAGEMENT_DOMAIN, NUXT_AUTH0_MANAGEMENT_AUDIENCE, NUXT_AUTH0_MANAGEMENT_CLIENT_ID, or NUXT_AUTH0_MANAGEMENT_CLIENT_SECRET in app runtime configuration.
- [x] #2 The Auth0 bootstrap action provisions the account-linking post-login behavior and uses only current Auth0 configuration names.
- [x] #3 The app verifies Auth0 Action redirect tokens, authenticates the existing account when required, returns a signed result to Auth0, and records linked platform identities without using an app-runtime Management API token.
- [x] #4 Deployment workflows and generated Wrangler config omit app-runtime Auth0 Management API variables while preserving Auth0 bootstrap and BDD fixture Management API configuration where it is actually required.
- [x] #5 Canonical docs and tests describe and validate the new account-linking flow without documenting legacy fallbacks.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented Auth0 Action-driven account linking with no app-runtime Auth0 Management API credentials or legacy management variable fallbacks. The app now verifies signed Auth0 Action redirect tokens, performs the existing-account ownership check through an isolated Auth0 database login, returns a signed continuation result to Auth0, and records linked Auth0 subjects from the Action-issued ID token claim. Deployment workflows, Wrangler config generation, Auth0 bootstrap automation, docs, and tests now use canonical management/bootstrap names only. Validation passed: bun run lint, bun run typecheck, bun run test:unit, and bun run test:integration. GitHub cleanup removed obsolete dev app-runtime management secrets and obsolete AUTH0_MANAGEMENT_AUDIENCE variables from dev and bdd; dev AUTH0_MGMT_CLIENT_ID and AUTH0_MGMT_CLIENT_SECRET were created empty and must be filled.
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
