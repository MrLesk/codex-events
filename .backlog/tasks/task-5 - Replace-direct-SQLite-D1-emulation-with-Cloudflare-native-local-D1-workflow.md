---
id: TASK-5
title: Replace direct SQLite D1 emulation with Cloudflare-native local D1 workflow
status: In Progress
assignee:
  - Codex
created_date: '2026-03-23 19:35'
updated_date: '2026-03-24 07:13'
labels:
  - backend
  - testing
  - cloudflare
  - infrastructure
dependencies: []
documentation:
  - docs/testing-strategy.md
  - DEVELOPMENT.md
  - 'https://developers.cloudflare.com/d1/best-practices/local-development/'
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Remove the direct node:sqlite-based D1 emulation layer from local development and automated tests, then switch the repository to a Cloudflare-recommended local D1 workflow using Wrangler/Miniflare-style bindings so CI and local development do not depend on Bun supporting node:sqlite.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Local development no longer depends on the runtime fallback that wraps node:sqlite as a D1 binding.
- [ ] #2 Automated tests and fixture bootstrap no longer import node:sqlite directly.
- [ ] #3 The repository has a Cloudflare-native local D1 configuration path for app runtime and tests.
- [ ] #4 Contributor docs explain the new local D1 workflow and CI expectations.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a repository `wrangler.jsonc` with the canonical `DB` D1 binding so local Node-based development can obtain a real Cloudflare local D1 proxy through Wrangler APIs.
2. Replace the `node:sqlite` framework fallback in `server/middleware/local-d1-binding.ts` with an async `getPlatformProxy()`-backed binding cache, and remove the custom `server/database/local-d1.ts` shim once no runtime code depends on it.
3. Replace the direct SQLite test harness in `tests/support/backend/fake-d1.ts`, `tests/support/backend/runtime.ts`, `tests/support/backend/api-route.ts`, and BDD fixture reset code with Miniflare-backed D1 bindings and async setup where needed.
4. Remove unit tests that only verify the deleted SQLite shim, update affected unit/integration/BDD tests for the async Cloudflare-native harness, and rerun the relevant validation layers.
5. Update `DEVELOPMENT.md` and `docs/testing-strategy.md` to describe the Wrangler/Miniflare local D1 workflow and remove the stale SQLite-specific guidance.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Plan recorded immediately before implementation after validating that `wrangler`'s `getPlatformProxy()` can expose a local `DB` D1 binding from a `wrangler.jsonc` file and that Miniflare can provide a real D1 binding for programmatic tests without `node:sqlite`. Follow-up within the same task: add native GitHub Actions dependency caching to both CI jobs, using Bun's shared install cache keyed from `bun.lock`, while avoiding low-value browser-cache complexity unless later measurements justify it.

Add GitHub Actions dependency caching to the split CI jobs after the Cloudflare-native D1 migration so repeated runs do not cold-install Bun packages in every job.

Added `actions/cache@v4` to `backend-checks` and `auth0-bdd-release-gate`, caching Bun's shared install cache from `bun.lock`, plus Playwright's browser cache for the BDD job.

Root-caused the six-hour `auth0-bdd-release-gate` hang to two issues: the bootstrap readiness probe could block forever on a half-open `nuxt dev` socket, and the dev server build path was still trying to statically bundle `wrangler`. Switched the local platform proxy to an opaque runtime import, added bounded readiness probes plus stage logging to the BDD bootstrap, and fixed stable Auth0 persona reconciliation to always reset existing test-user passwords so bootstrap login can complete.

Moved real D1/platform-backed tests from `tests/unit` to `tests/integration` so `test:unit` no longer depends on Wrangler/Miniflare-backed local D1. Verified `bun run test:unit` (26 files, 97 tests) and `bun run test:integration` (12 files, 68 tests) both pass after updating the moved migration fixture to match the current `teams` schema.
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
