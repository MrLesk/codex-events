---
id: TASK-267
title: Change shared blind and pitch judging scale from 0-10 to 1-5
status: Done
assignee:
  - Codex
created_date: '2026-04-17 21:29'
updated_date: '2026-04-17 21:41'
labels:
  - judging
  - scoring
  - docs
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the canonical judging model so blind-review criterion scores, pitch-review votes, and combined scores use a shared 1..5 scale instead of 0..10. This includes docs, validation, database constraints, judge workspace copy, and automated coverage.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update canonical docs and code comments/copy to define the shared judging scale as 1..5.
2. Change server validation and database score constraints for blind criterion scores and pitch scores to the 1..5 range.
3. Update judge workspace drafting, completion messaging, and score entry UI to match the 1..5 scale.
4. Update representative unit/integration/BDD tests and fixtures that currently encode the 0..10 range.
5. Run targeted integration coverage plus lint, typecheck, and unit tests.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Changed the shared judge scoring scale from 0-10 to 1-5 across validation, schema constraints, docs, judge UI copy, rubric options, and pitch vote entry. Added drizzle migration `0040_judge_score_scale_1_to_5.sql` that rebuilds score-bearing tables and remaps existing 0-10 scores into five buckets. Updated unit, integration, and BDD fixtures/expectations to the new scale and recomputed weighted outcome totals where needed.

Validation passed: `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/outcome-routes.test.ts tests/integration/server/api/judging-routes.test.ts`.

Validation passed: `bun run lint`.

Validation passed: `bun run typecheck`.

Validation passed: `bun run test:unit`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Changed the canonical blind and pitch judging scale from 0-10 to 1-5 across docs, validation, DB constraints, and judge/admin UI copy. Added migration `0040_judge_score_scale_1_to_5.sql` to rebuild score-bearing tables and remap existing 0-10 data into five buckets. Updated unit, integration, and BDD coverage so leaderboard, shortlist, pitch review, final deliberation, and outcomes expectations match the new shared scale. No additional automation gaps remain for this task.
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
