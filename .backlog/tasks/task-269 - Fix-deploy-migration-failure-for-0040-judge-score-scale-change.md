---
id: TASK-269
title: Fix deploy migration failure for 0040 judge score scale change
status: Done
assignee:
  - Codex
created_date: '2026-04-17 21:58'
updated_date: '2026-04-17 22:08'
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
Investigated GitHub Actions runs `24588129964` and `24588607088`. `backend-checks` passed; failure remained in `deploy-dev` during `bun run db:migrate:dev`. The first attempt using `PRAGMA foreign_keys=OFF/ON` was still insufficient on remote D1. The final fix rewrites `0040_judge_score_scale_1_to_5.sql` to migrate `judge_criterion_scores` into a temporary table first, drop the live child table, rebuild `judge_assignments`, then recreate the final `judge_criterion_scores` table from the staged data. This removes the parent-drop/child-FK conflict without relying on PRAGMA behavior. The migration regression test continues to build the pre-0040 schema, seed judge assignments and criterion scores, apply `0040`, verify score remapping, and assert `pragma foreign_key_check` stays clean.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed the deploy-only D1 migration failure in `0040_judge_score_scale_1_to_5.sql` with a remote-safe migration order. The migration now stages `judge_criterion_scores`, removes the live child FK before rebuilding `judge_assignments`, and recreates the final child table afterward, so it no longer depends on `PRAGMA foreign_keys=OFF`. Regression coverage applies `0040` against a populated pre-0040 judge dataset and verifies both the remapped scores and clean foreign-key integrity. Validation passed locally with lint, typecheck, unit tests, the full integration suite, and the targeted migration test.
<!-- SECTION:FINAL_SUMMARY:END -->
