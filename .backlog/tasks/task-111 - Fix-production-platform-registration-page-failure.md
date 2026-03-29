---
id: TASK-111
title: Fix production platform registration page failure
status: In Progress
assignee: []
created_date: '2026-03-29 21:50'
updated_date: '2026-03-29 22:23'
labels: []
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/README.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Investigate and fix the production error that returns HTTP 500 on `/account/register` for users who need to complete platform registration and current platform document acceptance. The page must load successfully in production and support the consent completion flow that gates access to other account and hackathon registration routes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `/account/register` loads successfully in production for a user who has not completed current platform registration
- [ ] #2 The platform registration page can render the current platform Terms and Privacy Policy content without server errors
- [ ] #3 Participant registration flows that redirect to `/account/register` no longer dead-end on a production 500
- [ ] #4 Relevant automated test coverage is added or updated for the failing path
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the production-safe local D1 binding middleware so the Wrangler platform proxy is only used for local development and test execution, never for deployed Workers requests or Nuxt error-page requests.
2. Refactor the platform registration page data path to use the same SSR-safe request pattern as the working session/shell composables instead of the current async `useFetch` wrapper for current platform documents.
3. Add focused regression coverage for the middleware guard and the platform documents composable behavior shape.
4. Validate locally with targeted tests, `bun run typecheck`, and `bun run test:unit`, then redeploy production and confirm `/account/register` is healthy with `wrangler tail` and the authenticated browser session.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Confirmed the production 500 with `wrangler tail` on March 30, 2026. The failing request emitted `No such module "wrangler"` from the Worker while rendering `/account/register`.

Root cause: `server/middleware/local-d1-binding.ts` attempted to load the local Wrangler platform proxy whenever any non-D1 binding was absent. Production requests that already had a real D1 binding could still hit that fallback and crash on the Worker runtime, where the `wrangler` package does not exist.

Implemented a narrower fallback: the middleware now returns immediately when a database binding is already present, and only uses the local Wrangler proxy when the request has no D1 binding at all. Added focused middleware tests for both paths. Validation passed with `bunx vitest run tests/unit/server/middleware/local-d1-binding.test.ts`, `bun run typecheck`, and `bun run test:unit`.

March 30: Tail output showed the `wrangler` import was happening on Nuxt's `__nuxt_error` request, while the original page failure was still `[nuxt] instance unavailable` on `/account/register`.

March 30: Updated `local-d1-binding` so the Wrangler platform proxy is only available during local dev/test execution, which prevents deployed Workers and Nuxt error-page requests from trying to import `wrangler`.

March 30: Refactored `useCurrentPlatformDocuments()` away from the async `useFetch` wrapper to the same `useAsyncData` plus request-fetch pattern already used by the working session/shell composables. The register page now consumes both account actor state and current platform documents without top-level awaited composable wrappers.

Validation: `bunx vitest run tests/unit/server/middleware/local-d1-binding.test.ts tests/unit/app/composables/useCurrentPlatformDocuments.test.ts`, `bun run typecheck`, `bun run test:unit`, and `bun run build:cloudflare` passed.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Canonical docs were updated or confirmed unchanged
- [ ] #2 Code behavior matches canonical docs
- [ ] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [ ] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [ ] #7 Auth and permissions changes follow the documented platform model
- [ ] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
