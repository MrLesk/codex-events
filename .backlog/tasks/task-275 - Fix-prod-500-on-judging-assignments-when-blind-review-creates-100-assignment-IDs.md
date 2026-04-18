---
id: TASK-275
title: >-
  Fix prod 500 on judging assignments when blind review creates 100+ assignment
  IDs
status: Done
assignee:
  - codex
created_date: '2026-04-18 16:48'
updated_date: '2026-04-18 16:50'
labels:
  - bug
  - production
  - judging
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`GET /api/hackathons/:hackathonId/judging/assignments` returns a 500 in production after blind review starts for a hackathon with more than 100 assignments. Tail output shows the failure occurs while loading `judge_criterion_scores` with a single `IN (...)` query over 101 assignment IDs. Fix the read path so the endpoint works for larger assignment sets without changing the response contract.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `GET /api/hackathons/:hackathonId/judging/assignments` succeeds when the hackathon has more than 100 blind-review assignments.
- [x] #2 The judging assignments response shape and ordering remain unchanged for existing callers.
- [x] #3 Regression coverage exercises the oversized assignment-id query case.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the judging assignments detail loader to fetch `judge_criterion_scores` in bounded chunks instead of one oversized `IN (...)` query.
2. Keep the existing ordering and response assembly unchanged by flattening chunked results before grouping by assignment.
3. Add an integration regression that creates more than 100 blind-review assignments and verifies `GET /api/hackathons/:hackathonId/judging/assignments` returns 200.
4. Run targeted tests for judging routes, then `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Confirmed the production 500 occurs in `GET /api/hackathons/:hackathonId/judging/assignments` when `getBlindAssignmentDetails()` loads `judge_criterion_scores` for 101 assignment IDs in one `IN (...)` query.

Reused the existing `chunkRowsForD1()` helper already used by large judging write paths to batch criterion-score reads without changing the endpoint response assembly.

Added an integration regression that inserts 101 blind-review assignments and verifies the admin list route returns 200 with the expected total.

Validation: `bun x vitest run --config vitest.integration.config.ts tests/integration/server/api/judging-routes.test.ts`, `bun run lint`, `bun run typecheck`, and `bun run test:unit` all passed.

Canonical docs and auth/permission behavior are unchanged by this fix.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Chunked blind-review criterion-score reads in `getBlindAssignmentDetails()` so the judging assignments list no longer sends a single oversized `IN (...)` query to D1 once a hackathon has more than 100 assignments. The fix reuses the existing `chunkRowsForD1()` helper already used by the blind-review and pitch-review bulk insert paths, then flattens and re-sorts the returned score rows before the existing grouping logic runs so the response contract stays unchanged.

Added an integration regression for the admin judging assignments route that seeds 101 blind-review assignments and verifies the endpoint returns 200 with the expected total instead of failing on D1 bind limits.

Validation run:
- `bun x vitest run --config vitest.integration.config.ts tests/integration/server/api/judging-routes.test.ts`
- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`

Follow-up/risk:
- This code change is not deployed yet, so production will continue returning the 500 until the next deploy includes this patch.
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
