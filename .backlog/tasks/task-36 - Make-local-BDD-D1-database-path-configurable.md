---
id: TASK-36
title: Make local BDD D1 database path configurable
status: Done
assignee:
  - '@codex'
created_date: '2026-03-27 07:52'
updated_date: '2026-03-27 09:50'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Allow local BDD and local migration flows to use an alternate local D1 persistence root instead of always using `.wrangler/state`, while keeping current behavior as default.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A single environment variable controls the local D1 persist root used by bootstrap/proxy migration flows for BDD.
- [x] #2 Default behavior remains unchanged when the variable is not set.
- [x] #3 Local guard logic validates the configured persist root path and keeps existing nested-state protection behavior.
- [x] #4 Developer docs describe how to run BDD against a different local D1 persistence path.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Introduce a shared local D1 persist-root resolver in `server/database/local-platform-proxy.ts` that reads an environment variable and defaults to `.wrangler/state`.
2. Update local fixture reset and migration calls in `tests/bdd/support/platform-fixtures.ts` to keep using the resolved persist root via existing helpers.
3. Update `tools/d1/ensure-local-state-path.ts` to validate nested-state paths based on the same environment-driven root.
4. Update `package.json` dev script to use the configured persist root (defaulting to `.wrangler/state`) so local migration behavior matches BDD/bootstrap.
5. Document the env var and usage examples in `DEVELOPMENT.md`.
6. Run `bun run test:unit` and a focused smoke check of the guard script.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented environment-driven local D1 persist-root resolution with `LOCAL_D1_STATE_ROOT` defaulting to `.wrangler/state` in `server/database/local-platform-proxy.ts`.

Updated local state guard script to validate nested-state paths under the configured persist root (`tools/d1/ensure-local-state-path.ts`).

Updated local dev migration script to use the same configurable root in `package.json` (`--persist-to ${LOCAL_D1_STATE_ROOT:-.wrangler/state}`).

Updated developer/testing docs to document the override path and keep canonical testing strategy wording aligned (`DEVELOPMENT.md`, `docs/testing-strategy.md`).

Validation: `bun run db:local:guard`, `LOCAL_D1_STATE_ROOT=.wrangler/state-alt bun run db:local:guard`, and `bun run test:unit` all passed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added support for using an alternate local D1 persistence root for BDD/local workflows while preserving existing defaults.

What changed:
- Introduced `LOCAL_D1_STATE_ROOT` resolution in `server/database/local-platform-proxy.ts` and kept `.wrangler/state` as the default.
- Updated local nested-state guard checks in `tools/d1/ensure-local-state-path.ts` to validate against the configured root.
- Updated the local `dev` migration command in `package.json` to use `--persist-to ${LOCAL_D1_STATE_ROOT:-.wrangler/state}`.
- Updated docs in `DEVELOPMENT.md` and `docs/testing-strategy.md` to document the override mechanism and default behavior.

Validation run:
- `bun run db:local:guard`
- `LOCAL_D1_STATE_ROOT=.wrangler/state-alt bun run db:local:guard`
- `bun run test:unit`

Notes:
- Default local behavior remains unchanged when `LOCAL_D1_STATE_ROOT` is unset.
- No product-domain behavior changed; this is local test/runtime configuration only.
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
