---
id: TASK-390
title: Merge duplicated public project showcase components
status: Done
assignee:
  - Codex
created_date: '2026-06-13 14:56'
updated_date: '2026-06-13 15:01'
labels:
  - client
  - refactor
dependencies: []
documentation:
  - docs/lifecycle-and-state-machines.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
parent_task_id:
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Remove duplicated display markup between the completed winners showcase and the additional published-projects showcase while preserving current routes, copy, test IDs, prize/rank presentation, empty states, and API contracts.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Winning projects and published projects share one focused project/member presentation component under `app/components/public/events`.
- [x] #2 `EventWinnersShowcase.vue` and `EventPublishedProjectsShowcase.vue` remain small wrappers that provide their current copy, data-testid values, badge behavior, prize/rank behavior, and empty states.
- [x] #3 Winner prize/rank display stays explicit and is not collapsed into generic published-project wording.
- [x] #4 Public and account event routes continue to call the existing exported showcase components without API or domain semantic changes.
- [x] #5 Required validation passes: `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Compare the existing winners and published-projects showcase markup to define the smallest shared component boundary.
2. Add focused normalized showcase item types where the wrappers need a common presentation contract.
3. Extract the repeated project card and member-list markup into one local shared component under `app/components/public/events`.
4. Update the two existing exported showcase components into thin wrappers that preserve existing copy, IDs, and conditional prize/member behavior.
5. Run required validation and record final notes, test gaps, and residual risk.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Extracted the repeated completed-project showcase markup into `EventProjectShowcase.vue`, keeping the existing winners and published-projects components as wrappers that provide their current section copy, empty states, test IDs, badge labels, and winner prize/rank summaries. Added a shared published-project showcase entry/member type in `published-outcomes.ts` without changing API payload fields or route callers.

Canonical docs, config, auth, permissions, server APIs, and domain semantics were confirmed unchanged. No focused tests were added because this is a presentational refactor with preserved behavior and the project does not currently have component-level showcase tests. Validation: `bun run lint` passed, `bun run test:unit` passed, and `bun run typecheck` passed for the staged TASK-390 patch in a clean temporary worktree. The same typecheck command fails in the shared dirty worktree because a concurrent unrelated edit in `app/components/judging/JudgeAssignmentWorkspacePanel.vue` references missing `describeJudgeAssignmentStatus`.

Residual risk: visual parity is preserved by moving existing markup, but no browser screenshot comparison was added for the showcase cards.
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
