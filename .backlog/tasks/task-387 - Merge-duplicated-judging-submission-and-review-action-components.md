---
id: TASK-387
title: Merge duplicated judging submission and review action components
status: Done
assignee:
  - Codex
created_date: '2026-06-13 14:57'
updated_date: '2026-06-13 15:03'
labels:
  - judging
  - frontend
  - refactor
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
parent_task_id:
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Consolidate duplicated blind and pitch judge submission panel markup and the repeated judge review progress/action footer while preserving existing behavior, API payloads, test hooks, and judge-facing copy.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Blind and pitch submission panels use one shared judging-local submission display component while keeping their existing wrapper component names.
- [x] #2 Shared submission display inputs are normalized in the judging domain without adding abstractions outside judging.
- [x] #3 Blind and pitch review branches use one shared progress/action/skip/ineligible footer component.
- [x] #4 Existing judging lifecycle logic, score behavior, auto-start behavior, API payloads, `data-testid` hooks, and judge-facing copy are preserved.
- [x] #5 Required validation passes: `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a judging-domain display normalization helper for blind and pitch submission panel data.
2. Add a shared `JudgeSubmissionPanel` component and keep `BlindSubmissionPanel` and `PitchSubmissionPanel` as thin wrappers.
3. Extract the duplicated review progress/action/skip/ineligible markup into a shared `JudgeReviewActionFooter` component.
4. Add focused unit coverage for the normalization helper and run the required validation commands.
5. Update this task with final validation, summary, and residual risk before committing.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Context-hunter L1 micro-brief: closest analogs are the existing `getJudgeAssignmentInboxCardCopy` and stage-aware judging helpers in `app/domains/judging/workspace.ts`; the native boundary is a judging-domain display helper plus small judging-local Vue components. Main risk is dropping existing `data-testid` hooks or changing branch-specific judge copy while consolidating the markup.

Implemented `getJudgeSubmissionPanelDisplay()` to normalize blind and pitch submission card display data, added a shared `JudgeSubmissionPanel`, kept `BlindSubmissionPanel` and `PitchSubmissionPanel` as wrappers, and extracted the repeated progress/action/skip/ineligible block into `JudgeReviewActionFooter`.

Validation: focused `bun x vitest run tests/unit/app/domains/judging/workspace.test.ts` passed; `bun run typecheck` and `bun run test:unit` passed in the shared worktree; scoped eslint over the touched judging files passed. The shared worktree `bun run lint` was blocked by an unrelated concurrent edit in `app/components/admin/AdminCompetitionFinalDeliberationPanel.vue`, so a clean temporary worktree containing only TASK-387 files was prepared with `bun x nuxt prepare`, then `bun run lint`, `bun run typecheck`, and `bun run test:unit` all passed there. BDD was not run because this was a behavior-preserving component refactor with no browser workflow change.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Merged the duplicated blind and pitch judge submission card markup behind a shared judging-local panel while preserving the existing wrapper components and data-testid hooks. The shared judging domain helper now owns stage-specific card copy, fallback text, links, status, ineligibility, team, and track display data.

Extracted the duplicated review progress/action/skip/ineligible footer from `JudgeAssignmentWorkspacePanel.vue` into one shared footer component used by both blind and pitch branches. The parent still owns the same computed state, auto-start behavior, score drafts, API calls, and mutation handlers.

Added focused unit coverage for the normalized submission panel display shapes. No canonical docs changes were required because this refactor does not change product behavior, permissions, API contracts, or lifecycle rules.
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
