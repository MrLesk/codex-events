---
id: TASK-388
title: Audit and remove stale duplicate-looking components
status: Done
assignee:
  - Codex
created_date: '2026-06-13 14:58'
updated_date: '2026-06-13 15:02'
labels:
  - client
  - cleanup
dependencies: []
documentation: []
parent_task_id:
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Audit the listed duplicate-looking Vue components and remove only the ones with no active callers through direct imports, Nuxt component auto-import aliases, lazy aliases, template tags, or dynamic component references. Keep active components unchanged unless a caller has a clear low-risk canonical replacement.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Each listed component is checked for direct imports, generated Nuxt component names, lazy aliases, PascalCase tags, kebab-case tags, and dynamic component references.
- [x] #2 Components with no active callers are removed without adding replacement abstractions, scripts, CI checks, or UX rewrites.
- [x] #3 Components with active callers are left unchanged unless a low-risk canonical replacement is proven.
- [x] #4 Required validation passes: `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
- [x] #5 Final notes list removed and kept components with evidence and residual risk.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Confirm Backlog task scope and inspect the current worktree for parallel changes.
2. Read Nuxt component auto-import configuration and generated component aliases.
3. Search all candidates by direct path, filename, generated alias, lazy alias, PascalCase tag, kebab-case tag, and dynamic component name.
4. Remove only candidates with no active callers and avoid adding new abstractions.
5. Run required validation and record final audit evidence, risks, and task completion state.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Removed 11 unused duplicate-looking components after checking direct imports, Nuxt generated component names from `.nuxt/components.d.ts`, lazy aliases, PascalCase tags, kebab-case tags, import paths, and dynamic `resolveComponent`/string component references. The removed components were `AppLogo.vue`, `PageHero.vue`, `TemplateMenu.vue`, `shell/DashboardEntryCard.vue`, `account/PlatformAccountProfileForm.vue`, `account/events/AccountEventParticipantSubmissionPanel.vue`, `teams/ParticipantTeamMembershipPanel.vue`, `teams/ParticipantTeamJoinRequestsPanel.vue`, `public/events/EventCriteriaList.vue`, `public/events/EventTermsReferences.vue`, and `admin/AdminCompetitionOutcomePanel.vue`.

No active callers were found, so no replacement abstraction or UX rewrite was added. Updated the stale security-analysis path from `ParticipantTeamMembershipPanel.vue` to the active `ParticipantTeamWorkspacePanel.vue`, which owns the current team-member rendering surface.

Validation passed with `bun run lint`, `bun run typecheck`, and `bun run test:unit`. Integration and BDD suites were not run because this cleanup removed unused client components only and did not change server integrations, Auth0-backed flows, or browser workflow behavior. Residual risk: existing BDD step definitions still mention test IDs that are no longer rendered by active public criteria/terms components, but those components already had no active route callers before this cleanup.
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
