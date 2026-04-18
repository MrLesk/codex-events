---
id: TASK-274
title: Fix production blind-review start regression
status: Done
assignee:
  - codex
created_date: '2026-04-18 15:49'
updated_date: '2026-04-18 15:57'
labels:
  - bug
  - production
  - judging
dependencies: []
references:
  - 'server/api/hackathons/[hackathonId]/actions/start-blind-review.post.ts'
  - >-
    server/api/hackathons/[hackathonId]/actions/start-judging-preparation.post.ts
  - server/utils/judging.ts
documentation:
  - docs/api-surface.md
  - docs/lifecycle-and-state-machines.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The `POST /api/hackathons/:hackathonId/actions/start-blind-review` route is returning an `internal_error` in production after the 2026-04-17 judging-start refactor. The likely regression is in the bulk write path added when submission locking, prize-eligibility snapshots, and blind-review assignments moved from `start-judging-preparation` into `start-blind-review`. Restore a reliable blind-review start for real production-sized hackathons without changing the canonical judging behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Starting blind review no longer fails with an unexpected internal error for production-scale submission and team-member counts.
- [x] #2 The same bulk-write hardening is applied to pitch-review assignment creation so the parallel production-scale failure mode is covered.
- [x] #3 The affected routes still perform the canonical transitions and side effects: blind review moves the hackathon to `blind_review`, locks submitted submissions, creates required blind-review assignments, creates prize-eligibility snapshots, and writes the audit entry; pitch review still creates the required pitch assignments and audit entry.
- [x] #4 Automated coverage reproduces the regression scenario and passes with the fix.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a small shared bulk-insert chunking helper for D1/SQLite write paths so large row sets are inserted in bounded slices rather than one oversized VALUES statement.
2. Update `server/api/hackathons/[hackathonId]/actions/start-blind-review.post.ts` to use the chunked inserts for prize-eligibility snapshots and blind-review assignments while preserving the existing transition ordering and audit behavior.
3. Update `server/api/hackathons/[hackathonId]/actions/start-pitch-review.post.ts` to use the same chunked assignment insertion pattern because it has the same production-scale risk profile.
4. Add integration coverage in `tests/integration/server/api/hackathon-routes.test.ts` that exercises large blind-review and pitch-review fanout counts which would have stressed the old single-statement insert path.
5. Run targeted tests first, then `bun run lint`, `bun run typecheck`, and `bun run test:unit`, and document any residual operational follow-up for already-affected prod hackathons if needed.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Discovery: the regression window matches the 2026-04-17 move of locking, snapshot creation, and blind-assignment creation from `start-judging-preparation` into `start-blind-review`. Likely production-only failure modes are large bulk inserts and stale preexisting judging rows from pre-refactor hackathons.

User approved expanding the emergency patch to cover the same bulk-write risk in `start-pitch-review` in the same change.

Implemented shared D1 row chunking in the judging utilities and applied it to both `start-blind-review` and `start-pitch-review` so oversized insert fanout is split into safe statement sizes.

Added integration coverage that simulates the D1 100-bind limit inside the test harness. The new large blind-review and pitch-review tests fail on the old single-statement insert shape and pass with the chunked writes.

Validation: `bun x vitest run --config vitest.integration.config.ts tests/integration/server/api/hackathon-routes.test.ts`, `bun run lint`, `bun run typecheck`, and `bun run test:unit` all passed.

Operational follow-up: after deploy, retry the affected production blind-review start. If the earlier failed attempt left inconsistent judging data, inspect the hackathon state, locked submissions, snapshots, and assignments before retrying.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Hardened the judging-start bulk write paths against D1 bind-parameter limits introduced by the 2026-04-17 refactor. Added a shared `chunkRowsForD1` helper in the judging utilities, then updated `start-blind-review` to chunk prize-eligibility snapshot inserts and blind-review assignment inserts, and updated `start-pitch-review` to chunk pitch-assignment inserts. This keeps the canonical lifecycle behavior unchanged while avoiding oversized single-statement `VALUES` inserts on production-sized hackathons.

Added integration regression coverage in `tests/integration/server/api/hackathon-routes.test.ts` that simulates the D1 100-bind ceiling and exercises large blind-review and pitch-review fanout counts. Validation passed with `bun x vitest run --config vitest.integration.config.ts tests/integration/server/api/hackathon-routes.test.ts`, `bun run lint`, `bun run typecheck`, and `bun run test:unit`.

Docs were confirmed unchanged. Residual operational note: if the earlier production failure left partial judging data on the affected hackathon, inspect state and judging rows before retrying the action after deploy.
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
