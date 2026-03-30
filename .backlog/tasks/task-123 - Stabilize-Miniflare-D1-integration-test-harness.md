---
id: TASK-123
title: Stabilize Miniflare D1 integration test harness
status: Done
assignee:
  - '@codex'
created_date: '2026-03-30 18:09'
updated_date: '2026-03-30 18:35'
labels: []
dependencies: []
references:
  - tests/support/backend/fake-d1.ts
  - tests/support/backend/migrations.ts
  - vitest.integration.config.ts
  - tests/integration/server/api/hackathon-admin-routes.test.ts
  - tests/integration/server/api/outcome-routes.test.ts
  - tests/integration/server/api/submission-routes.test.ts
documentation:
  - AGENTS.md
  - docs/testing-strategy.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fix the current `bun run test:integration` failures caused by the local Miniflare/D1 backend test harness. Keep the scope limited to deterministic harness reliability issues such as the `EADDRNOTAVAIL` connection failures currently surfacing in `tests/support/backend/fake-d1.ts` during full-suite setup, without changing product behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `bun run test:integration` passes locally without the current Miniflare/D1 `EADDRNOTAVAIL` setup failures
- [x] #2 The D1 test harness remains deterministic across the affected backend integration suites without changing application authorization or domain behavior
- [x] #3 Any harness or config changes are covered by targeted tests or existing coverage is updated to lock in the fix
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approved plan:
1. Reproduce the current Miniflare/D1 failure path with the smallest useful integration command and confirm whether it only appears under full-suite harness startup.
2. Inspect recent production D1-related code paths and nearby tests to identify regression boundaries the harness fix must preserve.
3. Refactor the D1 test harness in `tests/support/backend/fake-d1.ts` (and related helpers if needed) to reduce unstable Miniflare lifecycle churn while preserving isolated test database behavior.
4. Add or update focused coverage around the harness so the stability fix is locked in without changing product behavior.
5. Validate with `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bun run test:integration`, then record any remaining risks or unavoidable gaps.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Investigation: `tests/integration/server/database/fake-d1.test.ts` and `tests/integration/server/database/migration.test.ts` both pass in isolation, and `tests/integration/server/api/outcome-routes.test.ts` also passes alone. Reproduction requires repeated API-suite churn: running `hackathon-admin-routes`, `outcome-routes`, and `submission-routes` together reproduces `TypeError: fetch failed` with `EADDRNOTAVAIL` from Miniflare/undici inside `tests/support/backend/fake-d1.ts` during migrations and early queries.

Regression boundary to preserve: production D1 binding resolution in `server/database/client.ts` and `server/middleware/local-d1-binding.ts` must remain unchanged. Current tests encode that the runtime prefers an existing bound D1 database, only loads the local proxy when no binding exists in local/test execution, and that `TestD1Database` remains Drizzle-compatible and migration-complete. The harness fix should stay confined to test support and must not alter route authorization or schema behavior.

Replaced the Miniflare-backed fake D1 harness with an in-process `node:sqlite` D1-compatible shim in `tests/support/backend/fake-d1.ts` to remove the localhost proxy path causing `EADDRNOTAVAIL` during full integration runs.

Kept the production D1 resolution path unchanged; the fix is isolated to test support and updated integration coverage in `tests/integration/server/database/fake-d1.test.ts`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Stabilized the integration-test D1 harness by replacing the Miniflare-backed fake database with an in-process `node:sqlite` D1-compatible shim used only by test support.

What changed:
- Reworked `tests/support/backend/fake-d1.ts` so integration and backend-support tests no longer depend on Miniflare's localhost proxy for D1 queries.
- Preserved the existing fake D1 contract used by Drizzle and the test helpers, including prepared statements, batch behavior, migration application, and explicit raw-SQL execution.
- Extended `tests/integration/server/database/fake-d1.test.ts` with coverage for concurrent isolation and sequential clean-state behavior.

Validation:
- `bun run lint` passed with the existing 6 `vue/no-v-html` warnings only.
- `bun run typecheck` passed.
- `bun run test:unit` passed.
- `bun run test:integration` passed.

Docs/config:
- Canonical docs were unchanged.
- No production config or runtime behavior changed.

Risks/follow-ups:
- The test harness now relies on Node's built-in `node:sqlite`, which currently emits experimental warnings during unit and integration runs under the current runtime. The suite is stable, but the warnings remain until the runtime or harness strategy changes.
<!-- SECTION:FINAL_SUMMARY:END -->

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
