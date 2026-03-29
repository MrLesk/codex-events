---
id: TASK-112
title: Fix account register redirect crash for already-consented platform users
status: Done
assignee: []
created_date: '2026-03-29 22:36'
updated_date: '2026-03-29 22:43'
labels: []
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/README.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Investigate and fix the production failure where a platform user with current platform consent receives a 500 when opening `/account/register?returnTo=/account`. The route should redirect cleanly to the requested account destination instead of crashing with `[nuxt] instance unavailable`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `/account/register?returnTo=/account` redirects successfully for a platform user who has already accepted current platform documents
- [x] #2 The redirect path no longer throws `[nuxt] instance unavailable` in production
- [x] #3 Relevant automated regression coverage is added or updated for the redirect helper or middleware path
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Refactor the route-navigation guard helpers so they return redirect targets or actor results, rather than calling `navigateTo()` from inside an async utility after awaiting session fetches.
2. Update the `require-auth` and `require-platform-account` middleware to perform `navigateTo()` directly inside the route-middleware context using the returned redirect descriptor.
3. Add focused unit coverage for the authenticated `/account/register?returnTo=/account` redirect path and preserve the existing auth-navigation redirect semantics.
4. Validate with targeted tests and `bun run test:unit`, then redeploy production and verify `/account/register?returnTo=/account` redirects cleanly for the platform admin account without a 500.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
March 30: Reproduced the bug only for the authenticated redirect path. Anonymous access to `/account/register?returnTo=/account` still returns the expected `302` to login, and direct `/account` for the platform admin account loads successfully.

March 30: The failing case is a consented platform user leaving `/account/register`. `resolveActorAppRedirect()` correctly resolves `/account`, but the current guard helper was calling `navigateTo()` only after awaiting `/api/session` inside `ensureAuthenticatedActor()`. That async utility call path matches the live prod error `[nuxt] instance unavailable`.

March 30: Refactored the navigation guard helpers to return redirect descriptors instead of invoking `navigateTo()` themselves, and moved the actual `navigateTo()` call back into the route middleware files where Nuxt route context is active. Added focused unit coverage for the authenticated register-to-account redirect and the anonymous login redirect descriptor path.

Validation: `bunx vitest run tests/unit/app/utils/auth-navigation.test.ts tests/unit/app/utils/navigation-guards.test.ts`, `bun run typecheck`, and `bun run test:unit` passed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Reworked the client-side auth/navigation guard flow so redirect helpers no longer call `navigateTo()` from inside async utility functions after awaiting `/api/session`. The helpers now return redirect descriptors, and the actual `navigateTo()` call happens only inside the Nuxt route middleware context. Updated all route middleware that depends on these helpers to execute redirects from the middleware file itself.

Added focused regression coverage in `tests/unit/app/utils/navigation-guards.test.ts` for the exact authenticated redirect case from `/account/register?returnTo=/account`, plus the anonymous login redirect descriptor path. Validation passed with `bunx vitest run tests/unit/app/utils/auth-navigation.test.ts tests/unit/app/utils/navigation-guards.test.ts`, `bun run typecheck`, and `bun run test:unit`.

Published release `v0.1.0` again and verified production run `23720789459` completed successfully on commit `ffe95ba`. Live verification with the platform admin browser session showed `GET /account/register?returnTo=/account -> GET /account` with clean Worker logs and the account dashboard rendered normally. No canonical docs changed; this was a runtime redirect fix in the existing platform-access model.
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
