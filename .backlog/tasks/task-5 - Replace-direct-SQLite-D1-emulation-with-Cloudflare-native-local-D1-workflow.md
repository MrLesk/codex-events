---
id: TASK-5
title: Replace direct SQLite D1 emulation with Cloudflare-native local D1 workflow
status: Done
assignee:
  - Codex
created_date: '2026-03-23 19:35'
updated_date: '2026-03-24 16:35'
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
- [x] #1 Local development no longer depends on the runtime fallback that wraps node:sqlite as a D1 binding.
- [x] #2 Automated tests and fixture bootstrap no longer import node:sqlite directly.
- [x] #3 The repository has a Cloudflare-native local D1 configuration path for app runtime and tests.
- [x] #4 Contributor docs explain the new local D1 workflow and CI expectations.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Replace the local Wrangler loader in `server/database/local-platform-proxy.ts` with a Bun-compatible runtime load path based on `createRequire(import.meta.url)` so Nitro does not try to statically bundle `wrangler` through the request path.
2. Keep the local D1 binding flow backed by `wrangler`/`getPlatformProxy()`, but remove direct `node` process entrypoints from `package.json` so repository scripts execute through Bun only.
3. Update contributor documentation to describe the Bun-based local development flow and remove stale Node-specific wording where this task changed the implementation.
4. Validate the change by starting `bun run dev`, issuing a local HTTP request, and rerunning focused local-platform-proxy coverage with the appropriate test config or direct runtime checks.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Plan recorded immediately before implementation after validating that `wrangler`'s `getPlatformProxy()` can expose a local `DB` D1 binding from a `wrangler.jsonc` file and that Miniflare can provide a real D1 binding for programmatic tests without `node:sqlite`. Follow-up within the same task: add native GitHub Actions dependency caching to both CI jobs, using Bun's shared install cache keyed from `bun.lock`, while avoiding low-value browser-cache complexity unless later measurements justify it.

Add GitHub Actions dependency caching to the split CI jobs after the Cloudflare-native D1 migration so repeated runs do not cold-install Bun packages in every job.

Added `actions/cache@v4` to `backend-checks` and `auth0-bdd-release-gate`, caching Bun's shared install cache from `bun.lock`, plus Playwright's browser cache for the BDD job.

Root-caused the six-hour `auth0-bdd-release-gate` hang to two issues: the bootstrap readiness probe could block forever on a half-open `nuxt dev` socket, and the dev server build path was still trying to statically bundle `wrangler`. Switched the local platform proxy to an opaque runtime import, added bounded readiness probes plus stage logging to the BDD bootstrap, and fixed stable Auth0 persona reconciliation to always reset existing test-user passwords so bootstrap login can complete.

Moved real D1/platform-backed tests from `tests/unit` to `tests/integration` so `test:unit` no longer depends on Wrangler/Miniflare-backed local D1. Verified `bun run test:unit` (26 files, 97 tests) and `bun run test:integration` (12 files, 68 tests) both pass after updating the moved migration fixture to match the current `teams` schema.

Adjusted the local Wrangler loader to use `createRequire(import.meta.url)` so Nitro no longer attempts to statically transform `wrangler` during request handling.

Confirmed the runtime bug reproduced only on the first HTTP request to `bun run dev`; after the loader change, requesting `/` returns `200 OK` and the previous `RollupError` from `wrangler-dist/cli.js` no longer occurs.

Removed direct `node` entrypoints from `package.json` scripts. `dev` now runs through Bun, and `test:unit`/`test:integration` use `bun x vitest` because the initial `bun --bun ./node_modules/vitest/vitest.mjs` form caused Zod import failures under Bun.

Updated `DEVELOPMENT.md` to describe the Bun-based local D1 flow instead of Node-based wording.

Validated with `bun run test:unit`, `bun run test:integration`, a focused `tests/integration/server/database/local-platform-proxy.test.ts` run, and `bun run dev` plus `curl http://localhost:3000/` returning `200 OK`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed the Cloudflare-native local D1 migration and the Bun-only cleanup for local development. The local platform proxy now loads `wrangler` through `createRequire(import.meta.url)` at runtime, which prevents Nitro from statically transforming `wrangler` on the request path while still allowing `getPlatformProxy()` to expose the local `DB` binding from `wrangler.jsonc`. This removed the `RollupError` from `wrangler-dist/cli.js` that previously broke `bun run dev` on first request.

Repository scripts were aligned with the Bun-only constraint by removing direct `node` entrypoints from `package.json`. `dev` now runs through Bun, and the Vitest scripts use `bun x vitest`, which proved to be the Bun-compatible invocation after the intermediate `bun --bun ...vitest.mjs` form caused Zod import failures.

Documentation was updated so contributor guidance describes the Bun-based local D1 flow accurately.

Validation performed:
- `bun run test:unit`
- `bun run test:integration`
- `bun --bun ./node_modules/vitest/vitest.mjs run --config vitest.integration.config.ts tests/integration/server/database/local-platform-proxy.test.ts`
- `bun run dev` plus `curl http://localhost:3000/` returning `200 OK`

Risk/follow-up:
- The dev server still emits unrelated Vue/component warnings on `/`, but the Wrangler/Nitro startup regression is resolved.
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
