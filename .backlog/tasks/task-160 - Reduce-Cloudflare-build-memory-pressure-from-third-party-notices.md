---
id: TASK-160
title: Reduce Cloudflare build memory pressure from third-party notices
status: Done
assignee:
  - Codex
created_date: '2026-04-02 19:14'
updated_date: '2026-04-02 21:22'
labels:
  - build
  - ci
  - performance
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Stabilize the `bun run build:cloudflare` path used by CI deploys. Recent GitHub Actions runs showed an intermittent JavaScript heap OOM during the `deploy-dev` build step, while local RSS measurements indicate a build-memory regression after the third-party notices feature landed. The optimization should preserve the third-party notices page while reducing build-time memory pressure so deploys are less sensitive to runner variance.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `bun run build:cloudflare` completes locally after the optimization.
- [x] #2 The deployed third-party notices experience still exposes the generated package metadata, license labels, notice text, and license text needed by the page.
- [x] #3 The third-party notices feature no longer pushes the Nuxt build path through the same large compile-time payload that caused the intermittent CI OOM risk.
- [x] #4 Tests and supporting docs are updated where the generation or serving model changes.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Sample historical commits at wider intervals before TASK-150 to establish whether `build:cloudflare` was already heavy before the notices feature and quantify the shape of the regression.
2. Inspect the current notices generation and consumption path to separate generation from the Nuxt bundle path while preserving the published notices page.
3. Implement the approved change to move notices data out of the compile-time app bundle and into a generated artifact consumed outside the heaviest build path.
4. Validate with `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bun run build:cloudflare`, then record results and residual risk.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Measured local `build:cloudflare` peak RSS with detached worktrees and shared `node_modules` at wider checkpoints. Results: `HEAD` (`7d1e0ed`) 5520490496 bytes, `HEAD~25` (`ffb8db8`) 5040717824, `HEAD~50` (`3e67b87`) 5166235648, `HEAD~75` (`ffe95ba`) 5085921280, `HEAD~100` (`d08f832`) 5069324288, `1550256` 5781651456, `8874f85` 5170872320. This confirms a high pre-existing baseline around 5.0–5.17 GB with a distinct jump at TASK-150 and current HEAD still above the older baseline.

Verified that the notices generator is already decoupled from `build:cloudflare` as a generation step. `package.json` runs `NITRO_PRESET=cloudflare_module nuxt build` for `build:cloudflare`; it does not invoke `bun run notices:generate`. The likely issue is compile-time consumption of the generated TypeScript payload through the `#third-party-notices` alias, not generation timing.

Implemented the optimization by moving the generated notices payload from `shared/third-party-notices.generated.ts` to `public/third-party-notices.generated.json`, switching the notices page to `useFetch` the JSON asset, and removing the `#third-party-notices` alias from the Nuxt bundle graph.

Validation results: `bun run lint`, `bun run typecheck`, and `bun run test:unit` all passed. `build:cloudflare` also passed locally after the change with `/usr/bin/time -l` peak RSS of 5252382720 bytes versus 5520490496 bytes measured on current HEAD before the change during the earlier checkpoint sampling.

Post-build sanity checks confirmed the sample notice package name and license text were no longer present in `.output/server` or `.output/public/_nuxt` chunks; the notice payload now lives in `public/third-party-notices.generated.json` and is referenced by path from the built app.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Moved third-party notices off the compile-time Nuxt bundle path to reduce `build:cloudflare` memory pressure. The generator now emits `public/third-party-notices.generated.json` instead of a generated TypeScript module, the notices page fetches that JSON asset at runtime, and the old `#third-party-notices` alias plus generated TS file were removed. This preserves the published notices content while keeping the large payload out of Vite/Rollup's code-processing path.

Updated unit tests for the generator's new JSON payload contract and refreshed the contributor-facing `DEVELOPMENT.md` note for `bun run notices:generate`. Validation passed with `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `build:cloudflare`. Local `build:cloudflare` peak RSS dropped from 5520490496 bytes on current HEAD before the change to 5252382720 bytes after the change. Residual risk: the overall build is still heavy, so this reduces but does not eliminate the broader build-memory baseline.
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
