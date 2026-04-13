---
id: TASK-205.4
title: Implement judge workspace support for blind and pitch assignments
status: Done
assignee:
  - Codex
created_date: '2026-04-12 22:08'
updated_date: '2026-04-13 09:32'
labels:
  - judging
  - frontend
  - judge
dependencies:
  - TASK-205.2
  - TASK-201
references:
  - docs/domain-model.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
parent_task_id: TASK-205
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extend judge-facing assignment APIs and workspace surfaces so blind assignments remain anonymized and rubric-based while pitch assignments expose finalist identity and capture open pitch scores.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Judge assignment payloads and workspace state distinguish blind and pitch review stages explicitly.
- [x] #2 Blind assignment views remain anonymized and continue to use criterion scoring on the shared 0..10 scale.
- [x] #3 Pitch assignment views reveal project and team identity, capture a 0..10 pitch score, and reflect that all judges are expected to vote during the pitch stage.
- [x] #4 Judge inbox and assignment detail surfaces use stage-appropriate labels, copy, and completion behavior without regressing the active TASK-201 workspace simplification work.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update `app/utils/judging-workspace.ts` to model judge assignments as explicit `blind_review` and `pitch_review` variants, and add stage-aware helpers for inbox labels, detail copy, rubric/pitch completion payloads, and submission-safe display logic.
2. Update `app/composables/useJudgeWorkspace.ts` so judge assignment workspace state remains compatible with the discriminated payload and only treats evaluation criteria as relevant for blind assignments.
3. Update judge-facing UI in `app/pages/account/judging.vue`, `app/components/judging/JudgeAssignmentInboxCard.vue`, `app/components/judging/JudgeAssignmentWorkspacePanel.vue`, and `app/components/judging/BlindSubmissionPanel.vue`, adding `app/components/judging/PitchSubmissionPanel.vue` to render open pitch submissions with team/project identity and pitch voting copy while preserving blind anonymity and the simplified TASK-201 review flow.
4. Extend `tests/unit/app/utils/judging-workspace.test.ts` for stage-aware payload helpers and completion payload behavior, then run targeted unit tests and `bun run typecheck` if required by the shared type changes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Supervisor context brief (L2): stage-aware data shape belongs in `app/utils/judging-workspace.ts`, inbox/detail fetches are in `app/composables/useJudgeWorkspace.ts`, judge dashboard copy is in `app/pages/account/judging.vue`, and the actual blind-only rendering assumptions live in `JudgeAssignmentInboxCard.vue`, `JudgeAssignmentWorkspacePanel.vue`, and `BlindSubmissionPanel.vue`. Main risks are accidentally leaking identity in blind mode, overfetching blind-review criteria for pitch assignments, and regressing the simplified TASK-201 review flow.

Discovery complete: backend already serializes stage-aware judge assignments with `reviewStage`, blind payloads include `blindSubmission` plus `criterionScores`, and pitch payloads include `pitchSubmission` plus `pitchScore`/`pitchComment`. Judge-facing app types and UI still assume blind review everywhere, so implementation will focus on the approved frontend write scope without touching server files.

Implemented stage-aware judge workspace support within the approved frontend write scope. The shared app payload now discriminates `blind_review` vs `pitch_review`, blind views stay anonymized in the inbox/detail surfaces, pitch views expose finalist identity and a single `0-10` pitch vote with optional comment, and the workspace composable now treats evaluation criteria as blind-only data. Canonical docs were reviewed and remained unchanged for this task. Validation passed with `bun x vitest run tests/unit/app/utils/judging-workspace.test.ts`, `bun x eslint` on the edited files, and `bun run typecheck`.

Parent acceptance criteria #2-#4 remain open until the inbox/dashboard and assignment-detail child tasks land; only the stage-aware data-layer portion is complete so far.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed the judge workspace rollout for configurable judging stages. The judge-facing data model, inbox/dashboard copy, and assignment detail workspace now distinguish `blind_review` and `pitch_review` explicitly, preserve anonymity and rubric scoring for blind assignments, reveal finalist identity and capture 0..10 pitch votes for pitch assignments, and keep the streamlined TASK-201 review loop intact across both modes. Canonical docs were reviewed and remained unchanged for this frontend scope. Validation covered the judge workspace unit suite and shared type safety via `bun x vitest run tests/unit/app/utils/judging-workspace.test.ts` and `bun run typecheck`. Broader fixture and end-to-end coverage refresh continues under TASK-205.5.
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
