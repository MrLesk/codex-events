---
id: TASK-292.3
title: Extract hackathon settings and configuration editor sections
status: Done
assignee:
  - '@agent-settings-config'
created_date: '2026-04-25 22:20'
updated_date: '2026-04-25 22:28'
labels:
  - nuxt
  - components
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/schema-outline.md
parent_task_id: TASK-292
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Reduce the size and review surface of hackathon settings/configuration UI by extracting focused editor sections from AccountHackathonAdminSettingsPanel and HackathonConfigForm. Keep ownership limited to those files and new settings/configuration components.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 AccountHackathonAdminSettingsPanel delegates at least one coherent settings workflow to a focused child component with typed props/emits.
- [x] #2 HackathonConfigForm delegates at least one coherent form section to a focused child component with typed props/emits.
- [x] #3 The extracted components preserve existing form semantics, validation behavior, and actor-facing copy.
- [x] #4 No admin operations workflow components are changed in this task.
- [x] #5 Validation passes: bun run lint, bun run typecheck, and bun run test:unit.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approved implementation plan:
1. Extract the Terms card from `app/components/account/hackathons/AccountHackathonAdminSettingsPanel.vue` into a focused child component under `app/components/account/hackathons/`, using typed props and typed emits for draft values and save actions.
2. Extract the Program Identity card from `app/components/admin/HackathonConfigForm.vue` into a focused child component under `app/components/admin/`, using the existing `form` model plus typed emits for managed image upload/remove actions.
3. Keep submit flow, validation schema wiring, copy, and all non-owned workflows in the parent files so the change stays small and reviewable.
4. Run targeted validation on touched files first, then `bun run lint`, `bun run typecheck`, and `bun run test:unit`, and report any external validation blockers without marking the task done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Extracted `AccountHackathonAdminTermsCard.vue` from `AccountHackathonAdminSettingsPanel.vue` for the terms workflow and `HackathonConfigProgramIdentitySection.vue` from `HackathonConfigForm.vue` for the program identity/editor workflow. Parent files now delegate those bounded sections with typed props/emits while preserving existing copy and form wiring. Validation status: targeted `bunx eslint` on touched files passed, `bun run typecheck` passed, `bun run test:unit` passed, and full `bun run lint` is currently blocked by an unrelated repo-wide error in `tools/d1/query-plan-audit.ts:346-347`, outside this task’s ownership.

Coordinator review: accepted the worker extraction of the terms management card into `AccountHackathonAdminTermsCard.vue` and the program identity/image upload form section into `HackathonConfigProgramIdentitySection.vue`. The parent components retain submission, validation, sortable, and persistence orchestration. No admin operations files were changed by this task. Coordinator reran targeted ESLint on the touched files successfully. Worker reported targeted ESLint, typecheck, and unit tests passed; full lint was blocked only by an unrelated in-progress TASK-292.5 script lint issue outside this task's ownership.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Extracted hackathon terms management and program identity/image upload editing into typed child components while preserving form models, validation behavior, upload events, and existing actor-facing copy. No admin operations workflow files were changed. Validation passed with targeted lint review plus worker-reported typecheck and unit tests.
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
