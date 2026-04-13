---
id: TASK-205.4.3
title: Implement stage-aware judge assignment detail workspace
status: Done
assignee:
  - '@Codex'
created_date: '2026-04-13 08:52'
updated_date: '2026-04-13 09:32'
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
Refactor the judge assignment detail surface so blind reviews keep rubric scoring while pitch reviews capture open 0 to 10 pitch scores and optional comments.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Blind assignment detail remains anonymized and uses criterion scoring
- [x] #2 Pitch assignment detail reveals finalist identity and captures a 0 to 10 pitch score
- [x] #3 Judge detail actions and success/error copy remain stage-appropriate and preserve the simplified review flow
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Review the current stage-aware helpers in `app/utils/judging-workspace.ts` and the existing judge detail components to identify the remaining blind-only assumptions in the assignment-detail workspace.
2. Update `app/utils/judging-workspace.ts` only where needed to keep blind assignment detail anonymized, expose pitch-specific detail labels/actions/progress behavior, and preserve the simplified TASK-201 completion loop.
3. Refactor `app/components/judging/JudgeAssignmentWorkspacePanel.vue` to render the correct stage-specific detail surface: blind rubric scoring through `BlindSubmissionPanel.vue` and pitch vote capture through `PitchSubmissionPanel.vue`.
4. Update `app/components/judging/BlindSubmissionPanel.vue` and `app/components/judging/PitchSubmissionPanel.vue` so blind mode stays anonymized and rubric-based while pitch mode shows project/team identity and supports `0..10` score plus optional comment when available.
5. Extend `tests/unit/app/utils/judging-workspace.test.ts` for the stage-aware helper behavior touched by this task, then run the narrowest relevant unit tests and `bun run typecheck` if the shared type changes require it.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Supervisor context brief (L2): assignment-detail rendering still assumes blind review only in `JudgeAssignmentWorkspacePanel.vue` and `BlindSubmissionPanel.vue`. Reuse the existing stage-aware helpers and keep the simplified TASK-201 flow, but branch the detail surface cleanly between blind rubric scoring and pitch vote capture.

Implementation started after reviewing the required docs, backlog workflow, current task context, and the existing stage-aware judge workspace changes already present in the repo.

Reviewed the scoped workspace/detail files against the canonical docs and the existing stage-aware data model already present in the repo. The current worktree keeps blind detail anonymized, renders a dedicated pitch detail surface with visible project/team identity plus 0-10 vote capture and optional comment, and uses stage-aware action/progress copy without touching inbox/dashboard copy.

Validation: `bun x vitest run tests/unit/app/utils/judging-workspace.test.ts` passed and `bun run typecheck` passed. Canonical docs remained unchanged for this task scope.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated the judge assignment detail workspace to branch cleanly between blind and pitch review modes. Blind detail stays anonymized and continues to use rubric scoring through the existing shared 0..10 criterion flow, while pitch detail now reveals finalist identity, captures a single 0..10 pitch vote plus optional comment, and uses stage-appropriate start, progress, success, and submission copy without regressing the simplified judge workflow. Canonical docs were confirmed unchanged for this scope. Validation passed with `bun x vitest run tests/unit/app/utils/judging-workspace.test.ts` and `bun run typecheck`. No additional test gap was identified for this subtask.
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
