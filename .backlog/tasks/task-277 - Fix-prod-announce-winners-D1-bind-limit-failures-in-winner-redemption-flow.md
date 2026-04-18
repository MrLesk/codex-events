---
id: TASK-277
title: Fix prod announce-winners D1 bind-limit failures in winner redemption flow
status: Done
assignee:
  - codex
created_date: '2026-04-18 18:39'
updated_date: '2026-04-18 18:42'
labels:
  - bug
  - production
  - winners
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Production `POST /api/hackathons/:hackathonId/actions/announce-winners` is throwing an unhandled error for `hackathon_codex_vienna_2026_04_18`. Prod state and audit rows show the failure happens before any writes. Existing evidence points to D1 bind-limit pressure in the winner flow: the handler builds 15 prize redemption rows for this hackathon and inserts them in one statement, and related winner/snapshot/user lookups also use unbounded `IN (...)` queries. Fix the winner announcement path so announce-winners, winner views, and winner outcome email preparation stay under D1's bound-parameter limit without changing winner selection semantics.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `POST /api/hackathons/:hackathonId/actions/announce-winners` succeeds when winner announcement creates more than 100 bound parameters worth of prize redemption rows.
- [x] #2 Winner-related snapshot and recipient lookups in the same flow stay D1-safe for larger winner/member sets without changing winner selection semantics.
- [x] #3 Regression coverage exercises the oversized winner-announcement query/insert case.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Patched `announce-winners` to chunk prize redemption inserts with the same `chunkRowsForD1` pattern already used by other lifecycle transitions, so a large redemption set no longer exceeds D1's per-statement bind ceiling.

Patched winner-related snapshot and user lookups in `server/utils/prize-redemptions.ts`, `server/utils/hackathon-outcome-email-queue.ts`, and `server/utils/shortlist.ts` to keep winner views, redemption preparation, and winner-email recipient resolution D1-safe under larger winner/member sets.

Added an integration regression that seeds 100 additional winning-team snapshots, then verifies `POST /actions/announce-winners` still returns 200, creates 103 prize redemptions, and enqueues 102 winner emails.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Patched the winner announcement flow to stay under D1's bound-parameter limit without changing winner selection semantics. `server/api/hackathons/[hackathonId]/actions/announce-winners.post.ts` now chunks `prize_redemptions` inserts before calling `database.batch(...)`, matching the existing lifecycle-action pattern already used for blind-review and pitch-review setup.

Patched winner snapshot and recipient lookups in `server/utils/prize-redemptions.ts`, `server/utils/hackathon-outcome-email-queue.ts`, and `server/utils/shortlist.ts` to query `prize_eligibility_snapshots` and `users` in bounded chunks and then flatten the results back into the same effective ordering. This keeps announce-winners, winner outcome emails, and winner views safe for larger winner/member sets.

Added an integration regression in `tests/integration/server/api/outcome-routes.test.ts` that seeds 100 extra winner snapshots so the announce-winners path exceeds the D1 bind limit on both redemption creation and recipient lookup, then verifies the route still returns 200, creates 103 prize redemptions, and enqueues 102 winner emails.

Validation run:
- `bun x vitest run --config vitest.integration.config.ts tests/integration/server/api/outcome-routes.test.ts`
- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`

Canonical docs, config, and auth/permissions behavior were unchanged. The remaining step after commit is deployment so production picks up the fix.
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
