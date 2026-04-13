---
id: TASK-205.4.1
title: Add stage-aware judge assignment types and workspace data loading
status: Done
assignee: []
created_date: '2026-04-13 08:52'
updated_date: '2026-04-13 09:22'
labels:
  - judging
  - frontend
  - judge
dependencies: []
references:
  - docs/domain-model.md
  - docs/api-surface.md
parent_task_id: TASK-205.4
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refactor judge workspace types and composables so assignment payloads distinguish blind and pitch stages and only load the data required for each stage.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Judge assignment types model blind and pitch stages explicitly
- [x] #2 Judge workspace composables load stage-appropriate assignment data without assuming every review is blind
- [x] #3 Targeted judge-workspace type/composable tests pass locally
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Supervisor context brief (L2): current judge payload assumptions are centralized in `app/utils/judging-workspace.ts`, while assignment and criteria fetching live in `app/composables/useJudgeWorkspace.ts`. Main risks are preserving blind-only anonymity in the type model and not fetching blind-review criteria for pitch assignments.

Reviewed the in-flight write-scope changes and kept them as the landing for this task. `app/utils/judging-workspace.ts` now models `blind_review` and `pitch_review` assignments as explicit variants, blind payloads remain separate from pitch finalist identity, and `app/composables/useJudgeWorkspace.ts` now fetches evaluation criteria only for blind assignments. Validation passed with `bun x vitest run tests/unit/app/utils/judging-workspace.test.ts tests/unit/app/composables/useJudgeWorkspace.test.ts` (the composable test path is currently absent, so only the utility suite executed) and `bun run typecheck`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Judge workspace data loading is now stage-aware. Blind and pitch assignments use explicit discriminated types, blind payloads stay separate from pitch finalist identity, and the assignment composable only loads evaluation criteria when the active assignment is a blind review.

Targeted judge-workspace utility tests passed, and shared typecheck completed successfully.

Judge assignment types are now stage-aware at the app boundary, with discriminated blind and pitch variants normalized from the API payload so blind assignments do not carry pitch-only fields and pitch assignments do not pretend to be blind.

Judge workspace composables now normalize assignment payloads before exposing them and only load evaluation criteria for blind-review assignments; targeted judge-workspace unit tests and typecheck passed locally.
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
