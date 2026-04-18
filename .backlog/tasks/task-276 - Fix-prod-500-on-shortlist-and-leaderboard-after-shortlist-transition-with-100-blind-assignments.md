---
id: TASK-276
title: >-
  Fix prod 500 on shortlist and leaderboard after shortlist transition with 100+
  blind assignments
status: Done
assignee:
  - codex
created_date: '2026-04-18 17:12'
updated_date: '2026-04-18 17:15'
labels:
  - bug
  - production
  - shortlist
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After moving `hackathon_codex_vienna_2026_04_18` to `shortlist`, production now returns 500 from `GET /api/hackathons/:hackathonId/leaderboard` and `GET /api/hackathons/:hackathonId/shortlist`. Tail output shows both fail while loading `judge_criterion_scores` with a single `IN (...)` query over 109 assignment IDs in `server/utils/shortlist.ts`. Fix the shortlist/leaderboard read path so both endpoints work for larger blind-review assignment sets without changing response shape or ordering.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `GET /api/hackathons/:hackathonId/leaderboard` succeeds when the shortlist/leaderboard loader needs more than 100 blind-review assignment IDs.
- [x] #2 `GET /api/hackathons/:hackathonId/shortlist` succeeds for the same large blind-review assignment set without changing shortlist semantics.
- [x] #3 Regression coverage exercises the oversized shortlist/leaderboard assignment-id query case.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the shortlist competition loader to fetch `judge_criterion_scores` in bounded chunks instead of one oversized `IN (...)` query.
2. Keep leaderboard and shortlist response assembly unchanged by flattening chunked score rows before existing grouping and ranking logic runs.
3. Add an integration regression that seeds more than 100 blind-review assignment IDs and verifies both `GET /leaderboard` and `GET /shortlist` succeed.
4. Run targeted outcome-route tests, then `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Reused the existing D1 chunking pattern from `server/utils/judging.ts` in the shortlist loader so leaderboard and shortlist still assemble from a flattened, created-at ordered score set.

Added an integration regression in `tests/integration/server/api/outcome-routes.test.ts` that seeds 97 skipped blind-review assignments on top of the existing 4 completed ones, pushing the score lookup above 100 assignment IDs without changing the expected shortlist or leaderboard output.

Confirmed canonical docs, config, and auth/permission behavior are unchanged for this fix.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Patched `server/utils/shortlist.ts` to fetch `judge_criterion_scores` in D1-safe chunks instead of issuing one oversized `IN (...)` query across every blind-review assignment ID. The loader still flattens and sorts the returned score rows before the existing grouping and ranking logic runs, so shortlist and leaderboard semantics stay unchanged while avoiding the production bind-limit failure.

Added an integration regression in `tests/integration/server/api/outcome-routes.test.ts` that seeds 101 blind-review assignment IDs for a shortlist hackathon by layering skipped assignments on top of the normal completed reviews, then verifies both `GET /leaderboard` and `GET /shortlist` return 200 with the same ranks and finalist boundary.

Validation run:
- `bun x vitest run --config vitest.integration.config.ts tests/integration/server/api/outcome-routes.test.ts`
- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`

No canonical docs, config, or auth model changes were required. Remaining follow-up is deployment: production will keep returning the shortlist/leaderboard 500 until this hotfix release is published and deployed.
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
