---
id: TASK-303.10
title: Extract client API helpers from admin workspace
status: Done
assignee:
  - Codex
created_date: '2026-04-29 17:49'
updated_date: '2026-04-29 17:56'
labels:
  - architecture
  - client
  - refactor
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
modified_files:
  - app/lib/api.ts
  - app/utils/admin-workspace.ts
  - app/composables/useAdminWorkspace.ts
  - app/composables/useApiData.ts
  - app/composables/useJudgeWorkspace.ts
  - app/composables/useHackathonRoleRosterWorkspace.ts
  - app/components/account/AccountPlatformAdminRosterPanel.vue
  - app/components/account/hackathons/AccountHackathonAdminOperationsPanel.vue
  - app/components/account/hackathons/AccountHackathonAdminSettingsPanel.vue
  - app/components/account/hackathons/AccountHackathonFeedbackPanel.vue
  - app/components/account/hackathons/AccountHackathonGalleryPanel.vue
  - >-
    app/components/account/hackathons/AccountHackathonParticipantVisibilityPanel.vue
  - app/components/account/hackathons/AccountHackathonPublishedRosterPanel.vue
  - app/components/account/hackathons/AccountHackathonRoleRosterPanel.vue
  - app/components/public/hackathons/HackathonFeedbackForm.vue
  - app/components/judging/JudgeAssignmentWorkspacePanel.vue
  - app/pages/account/register.vue
  - app/pages/account/settings.vue
  - app/pages/admin/hackathons/new.vue
  - app/utils/judging-workspace.ts
  - tests/unit/app/lib/api.test.ts
  - tests/unit/app/utils/admin-workspace.test.ts
parent_task_id: TASK-303
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Move generic client API response/error/cache helpers out of app/utils/admin-workspace so non-admin pages and components do not depend on admin workspace for basic request shapes and error normalization. Preserve behavior while reducing the admin workspace utility surface.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Generic API response types, pagination helper, cache-key helper, subject-key helper, and API error normalization live outside app/utils/admin-workspace.
- [x] #2 Callers import those generic helpers from the neutral client API helper module directly, with no compatibility re-export from admin-workspace.
- [x] #3 Admin workspace tests are adjusted so generic API helper coverage lives with the neutral helper module.
- [x] #4 The refactor preserves behavior and passes required validation: lint, typecheck, and unit tests.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create app/lib/api.ts for generic ApiErrorShape, ApiDataResponse, ApiListResponse, listAllPaginatedItems, getApiSubjectKey, buildApiCacheKey, and normalizeApiError.
2. Remove those generic exports from app/utils/admin-workspace and update all callers to import them from ~/lib/api directly.
3. Move the generic helper tests out of admin-workspace.test.ts into tests/unit/app/lib/api.test.ts, keeping admin-workspace.test.ts focused on admin domain/workspace behavior.
4. Run targeted API/admin workspace tests, then bun run lint, bun run typecheck, and bun run test:unit.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Extracted generic client API response shapes, paginated-list loading, cache-key subject normalization, and API error normalization into app/lib/api.ts. Updated direct callers to import the generic helpers from the neutral API module, removed remaining local duplicates in generic API/data surfaces, and moved helper coverage into tests/unit/app/lib/api.test.ts so admin-workspace tests stay focused on admin/workspace behavior. Canonical product docs are unchanged because this is an internal architecture refactor. Validation passed: targeted API/admin-workspace tests, bun run lint, bun run typecheck, and bun run test:unit.
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
