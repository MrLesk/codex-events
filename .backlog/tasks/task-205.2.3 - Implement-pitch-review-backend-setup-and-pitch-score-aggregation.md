---
id: TASK-205.2.3
title: Implement pitch-review backend setup and pitch score aggregation
status: Done
assignee:
  - Codex
created_date: '2026-04-13 06:13'
updated_date: '2026-04-13 07:03'
labels:
  - judging
  - backend
dependencies:
  - TASK-205.2.2
references:
  - docs/domain-model.md
  - docs/api-surface.md
parent_task_id: TASK-205.2
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add the optional pitch-review backend stage, including finalist assignment fanout to the frozen pitch panel and score aggregation over submitted pitch votes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Pitch-review start logic supports both pitch-only hackathons and blind-plus-pitch hackathons after shortlist selection.
- [x] #2 Pitch assignments are created per finalist submission per frozen judge panel member.
- [x] #3 Pitch score aggregation averages submitted votes only and tolerates admins closing the stage with missing votes.
- [x] #4 Targeted backend tests cover pitch assignment creation and score aggregation.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect the current judging schema, lifecycle routes, and tests to identify the minimal stage-aware changes required for pitch-review setup and score aggregation.
2. Update the judge-assignment schema and add the next migration so assignments can distinguish `blind_review` vs `pitch_review`, represent blind slots, store pitch votes, and coexist without the current single-active-assignment-per-submission conflict. Keep any persisted pitch-finalist storage limited to the canonical field already defined in the schema docs.
3. Add `start-pitch-review` for the two supported entry paths only: `judging_preparation` for pitch-only hackathons using all locked submissions, and `shortlist` for blind-plus-pitch hackathons using the persisted ordered finalist submission IDs.
4. Make judging assignment list/detail/start/complete/skip/force-skip logic stage-aware enough for pitch assignments while preserving current blind-review behavior and existing authorization patterns.
5. Add pitch-score aggregation helpers/tests so submission pitch scores average only submitted completed pitch-review votes and tolerate skipped or missing votes.
6. Run targeted validation for the touched judging routes and utilities, and report the exact commands executed plus any remaining gaps.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Scoped as a stage-aware judging backend slice: update assignment schema/migration for blind and pitch stages, add pitch-review start flow, and make assignment list/detail/start/complete/skip routes stage-aware without touching shortlist/final-deliberation outcome logic.

Implemented stage-aware judge-assignment schema and migration with `review_stage`, `blind_review_slot`, pitch vote fields, and persisted `pitch_finalist_submission_ids_json`, replacing the old single-active-assignment-per-submission constraint with blind-slot and pitch-panel uniqueness rules.

Added `start-pitch-review` for pitch-only and blind-plus-pitch paths, updated assignment serialization and lifecycle handlers for pitch assignments, preserved blind replacement behavior with blind-slot-aware replacement selection, and added pitch score averaging over submitted completed pitch votes only.

Validation run: `bun x eslint ...targeted files...`; `bun x vitest run tests/unit/server/utils/judging.test.ts tests/unit/server/auth/authorization.test.ts tests/unit/server/database/schema.test.ts`; `bun x vitest run --config vitest.integration.config.ts tests/integration/server/api/judging-routes.test.ts tests/integration/server/api/hackathon-routes.test.ts tests/integration/server/database/migration.test.ts`; `bun run typecheck`.

Implemented stage-aware judge assignments with schema and migration support for blind and pitch stages, added `start-pitch-review` for pitch-only and shortlist-driven hackathons, made assignment list/detail/start/complete/skip/force-skip routes pitch-aware, and added targeted unit/integration coverage for pitch assignment creation and missing-vote pitch score averaging.
<!-- SECTION:NOTES:END -->

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
