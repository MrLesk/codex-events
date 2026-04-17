---
id: TASK-269
title: Fix deploy migration failure for 0040 judge score scale change
status: Done
assignee:
  - Codex
created_date: '2026-04-17 21:58'
updated_date: '2026-04-17 22:01'
labels:
  - ci
  - migrations
  - judging
  - d1
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Patch `0040_judge_score_scale_1_to_5.sql` so it applies successfully on a populated remote D1 database, and add regression coverage that exercises the migration against pre-0040 judge assignments and criterion scores.
<!-- SECTION:DESCRIPTION:END -->

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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Investigated GitHub Actions run `24588129964`. `backend-checks` passed; failure was in `deploy-dev` during `bun run db:migrate:dev`. Root cause was `0040_judge_score_scale_1_to_5.sql` dropping and recreating `judge_assignments` while the existing `judge_criterion_scores` table still held a live foreign key to it, which fails on the populated remote D1 database. Wrapped the migration with `PRAGMA foreign_keys=OFF/ON` and added a migration regression test that builds the pre-0040 schema, seeds judge assignments and criterion scores, applies `0040`, verifies score remapping, and asserts `pragma foreign_key_check` stays clean.

Validation passed: `bunx vitest run --config vitest.integration.config.ts tests/integration/server/database/migration.test.ts`.

Validation passed: `bun run lint`.

Validation passed: `bun run typecheck`.

Validation passed: `bun run test:unit`.

Validation passed: `bun run test:integration`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed the deploy-only migration failure in `0040_judge_score_scale_1_to_5.sql` by disabling foreign-key enforcement around the table rebuild and restoring it afterward. Added a regression test that applies the pre-0040 schema, seeds judge assignments and criterion scores, runs `0040`, verifies the remapped scores, and asserts `pragma foreign_key_check` is clean. Validation passed locally with lint, typecheck, unit tests, the full integration suite, and the targeted migration test.
<!-- SECTION:FINAL_SUMMARY:END -->
