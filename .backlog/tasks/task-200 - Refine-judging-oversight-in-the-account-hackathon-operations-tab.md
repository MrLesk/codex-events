---
id: TASK-200
title: Refine judging oversight in the account hackathon operations tab
status: Done
assignee:
  - codex
created_date: '2026-04-12 16:02'
updated_date: '2026-04-12 18:01'
labels: []
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Restructure the judging oversight surface in the account hackathon Operations tab so hackathon admins can understand judge load at a glance, see assignments grouped by judge, and reassign specific submissions from a focused popup instead of from inline controls.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The judging oversight panel groups visible active assignments by judge and shows each judge with the submissions currently assigned to them.
- [x] #2 Each reassignable submission row exposes a dedicated reassign action on the right that opens a popup with the existing replacement-judge selection and operational note inputs.
- [x] #3 Started assignments remain visible in the grouped view so force-skip remains available from the oversight surface.
- [x] #4 The judging oversight card and its inner rows use the standard workspace card spacing instead of custom non-standard padding.
- [x] #5 Relevant automated tests are added or updated for the grouped oversight and reassign popup behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Group visible active judging assignments by judge in the oversight panel so admins can scan load judge-by-judge.
2. Render each assignment as a submission row inside its judge section, with status and actions aligned on the right.
3. Replace the inline reassignment controls with a focused popup that preserves the existing replacement-judge selector, auto-balance default, and operational note.
4. Keep started assignments visible so force-skip remains available from the same grouped oversight surface.
5. Normalize panel and row spacing to the standard workspace card pattern.
6. Add or update focused unit coverage, then run lint, typecheck, and unit tests.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
User approved the grouped-by-judge oversight plan with reassign moved into a popup and started assignments kept visible for force-skip.

Implemented the judging oversight refactor in `AdminCompetitionAssignmentsPanel` with judge-grouped sections, per-row reassign actions, and a focused reassignment popup while keeping force-skip available on started assignments.

Added `buildAdminJudgeAssignmentOversightGroups` in `app/utils/admin-workspace.ts` and covered the grouping/sort behavior in `tests/unit/app/utils/admin-workspace.test.ts`.

Validation results: targeted `bun x vitest run tests/unit/app/utils/admin-workspace.test.ts` passed and targeted `bun x eslint app/components/admin/AdminCompetitionAssignmentsPanel.vue app/utils/admin-workspace.ts tests/unit/app/utils/admin-workspace.test.ts` passed. Full `bun run lint`, `bun run typecheck`, and `bun run test:unit` remain blocked by unrelated existing failures in other files already present in the worktree.

Updated the judging oversight submission rows to use the same inset-card treatment as the team member request list and aligned the right-side action area with vertical centering on large screens.

Re-ran the required repo validations before commit: `bun run lint`, `bun run typecheck`, and `bun run test:unit` all passed locally.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Refined the account hackathon Operations judging oversight panel so hackathon admins see active submissions grouped by judge, with each submission rendered as a clearer row that surfaces status, lifecycle timing, and right-aligned actions. Reassignment now happens through a focused popup instead of inline controls, while started assignments remain visible with force-skip available from the same grouped view.

Added `buildAdminJudgeAssignmentOversightGroups` to centralize the judge-grouping and sort behavior, and covered that helper with unit tests. The row styling was also aligned with the existing team member request card pattern so the action affordances sit on the right with more standard workspace spacing.

Validation: `bun run lint`, `bun run typecheck`, and `bun run test:unit` passed locally. No canonical docs or config changes were required. Follow-up risk: none identified beyond the current canonical reassignment rule, which still allows a submission to return to a prior judge in a later reassignment cycle.
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
