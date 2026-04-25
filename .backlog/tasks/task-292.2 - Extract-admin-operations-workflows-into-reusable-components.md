---
id: TASK-292.2
title: Extract admin operations workflows into reusable components
status: Done
assignee:
  - Erdos
created_date: '2026-04-25 22:20'
updated_date: '2026-04-25 22:26'
labels:
  - nuxt
  - components
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
parent_task_id: TASK-292
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Reduce the size and review surface of the hackathon admin operations panel by extracting coherent workflow sections into reusable components without changing admin behavior. Keep ownership limited to the operations panel and newly created operation-focused components.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 AccountHackathonAdminOperationsPanel delegates at least two coherent workflow sections to focused child components with typed props/emits.
- [x] #2 The extracted components keep existing user-facing copy and behavior unless a local bug is found and documented in the task notes.
- [x] #3 No settings/configuration components are changed in this task.
- [x] #4 Existing admin operation tests continue to pass, and new unit coverage is added only where extraction creates meaningful standalone logic.
- [x] #5 Validation passes: bun run lint, bun run typecheck, and bun run test:unit.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extract the inline live pitch workflow card from `app/components/account/hackathons/AccountHackathonAdminOperationsPanel.vue` into a focused typed child component under `app/components/admin/`.
2. Extract the inline pitch review workflow card from the same panel into a second focused typed child component under `app/components/admin/`.
3. Keep fetch, mutation, and lifecycle orchestration logic in the parent panel; pass only the display state and action callbacks needed through typed props/emits.
4. Preserve existing admin-facing copy and behavior exactly; avoid changes to settings/configuration components or unrelated workflow sections.
5. Run targeted validation for the touched surface, then `bun run lint`, `bun run typecheck`, and `bun run test:unit` before handoff.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Discovery summary (2026-04-26): `AccountHackathonAdminOperationsPanel.vue` already delegates shortlist, judging oversight, final deliberation, prize redemptions, participant approvals, and submission operations into focused child panels. The remaining inline competition workflow sections with the clearest extraction boundary are the live pitch stage card and the pitch review card. A second viable candidate is the lifecycle summary/next-action hero, but the pitch-stage/pitch-review pair keeps the change narrower and avoids overlap with TASK-292.3 settings/config extraction.

Coordinator review: accepted the worker extraction of the live pitch stage and pitch review cards into `AdminCompetitionPitchStagePanel.vue` and `AdminCompetitionPitchReviewPanel.vue`. The parent retains orchestration and passes typed display/action state into child components. No settings/configuration files were touched by this task. Coordinator reran targeted ESLint on the touched files successfully; worker reported bun run lint, bun run typecheck, and bun run test:unit passed before handoff.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Extracted the live pitch stage and pitch review workflow cards from AccountHackathonAdminOperationsPanel into two typed admin child components while keeping API mutations and lifecycle orchestration in the parent. Existing copy and behavior were preserved. Validation passed per worker handoff, with coordinator targeted lint review also passing.
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
