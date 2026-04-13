---
id: TASK-210
title: Reduce CI deploy build memory pressure for Cloudflare deploys
status: Done
assignee:
  - codex
created_date: '2026-04-13 18:36'
updated_date: '2026-04-13 18:38'
labels:
  - ci
  - build
  - cloudflare
dependencies: []
references:
  - 'https://github.com/MrLesk/codex-hackathons/actions/runs/24357952152'
documentation:
  - /.github/workflows/ci.yml
  - /.github/workflows/release-production.yml
  - /nuxt.config.ts
  - /wrangler.jsonc
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Stabilize the GitHub Actions deploy build for the Cloudflare Worker after recent growth in the Nuxt/Nitro build graph pushed the CI runner into a Node heap out-of-memory failure during `bun run build:cloudflare`. The fix should keep runtime behavior unchanged while reducing build-time memory pressure and ensuring the deploy workflows do not rely on the default Node heap limit.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 GitHub Actions deploy workflows no longer rely on the runner default Node heap when building the Cloudflare deploy artifact.
- [x] #2 Production Nuxt builds avoid unnecessary sourcemap generation to reduce deploy build memory pressure without changing runtime behavior.
- [x] #3 Local verification covers the Cloudflare production build and the required repository validation commands, with any pre-existing unrelated failures explicitly documented.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add an explicit Node heap override to the GitHub Actions deploy jobs so `bun run build:cloudflare` and the Wrangler-triggered custom build do not rely on the runner default heap.
2. Disable production Nuxt sourcemaps in `nuxt.config.ts` to reduce build-time memory pressure and deploy artifact overhead without changing runtime behavior.
3. Verify the change with `bun run build:cloudflare`, `bun run lint`, `bun run typecheck`, and `bun run test:unit`, then document any unrelated pre-existing failures in the task notes and handoff.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added `NODE_OPTIONS=--max-old-space-size=4096` to the deploy jobs in `.github/workflows/ci.yml` and `.github/workflows/release-production.yml` so Wrangler-triggered Cloudflare builds do not inherit the default Node heap limit on GitHub runners.

Disabled production Nuxt sourcemaps in `nuxt.config.ts` using the installed `sourcemap.client` and `sourcemap.server` config keys while preserving non-production sourcemaps.

Verified `bun run build:cloudflare` locally after the change; the build completed successfully and Nitro output dropped from roughly 4.17 MB to 3.53 MB compared with the previous local measurement.

Validation results: `bun run lint` passed, `bun run typecheck` passed, and `bun run test:unit` passed. No canonical docs changes were required because this work only adjusts CI/build configuration.

Residual follow-up: the build still emits the existing large client chunk warning, so if deploys continue to approach CI memory limits the next step should be chunk splitting or lazy-loading in the heavy admin/judging surfaces rather than adding more memory-only fixes.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Raised the Node heap available to GitHub Actions deploy builds and disabled production Nuxt sourcemaps to reduce Cloudflare deploy build memory pressure. The CI deploy workflow for `main` and the production release workflow now export `NODE_OPTIONS=--max-old-space-size=4096` before running Wrangler, so the custom `bun run build:cloudflare` step no longer depends on the runner default heap limit. In parallel, `nuxt.config.ts` now disables production client and server sourcemaps while preserving non-production sourcemaps, which materially reduced the local Nitro output size and lowers build-time memory overhead without changing runtime behavior.

Validation completed locally with `bun run build:cloudflare`, `bun run lint`, `bun run typecheck`, and `bun run test:unit`, and all passed. Canonical docs were confirmed unchanged because the work is limited to CI/build configuration. Remaining risk: the build still reports an oversized client chunk warning, so the next durable optimization would be to split or lazy-load the heaviest admin/judging bundles if CI memory pressure returns.
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
