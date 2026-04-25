---
id: TASK-291.2
title: Introduce Nuxt 4.4 API data-fetching composables
status: Done
assignee:
  - agent-fetch-core
created_date: '2026-04-25 20:44'
updated_date: '2026-04-25 20:59'
labels:
  - nuxt
  - data-fetching
dependencies: []
references:
  - AGENT-SPAWN-NOTES.md
documentation:
  - docs/README.md
  - docs/domain-model.md
  - 'https://nuxt.com/blog/v4-4'
  - 'https://nuxt.com/docs/4.x/getting-started/data-fetching'
  - 'https://nuxt.com/docs/4.x/api/composables/use-fetch'
parent_task_id: TASK-291
priority: high
ordinal: 1200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the shared client-side API data-fetching layer that later route and workspace refactors can use. Scope is limited to app composables and app utilities that can be migrated without touching hackathon page templates, admin workspace panels, database code, or server routes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A reusable app API data-fetching composable layer exists and is based on Nuxt-managed data-fetching APIs rather than ad hoc `$fetch` selection.
- [x] #2 The composable layer supports SSR request context, stable cache keys, typed API responses, and request cancellation where Nuxt provides it.
- [x] #3 Duplicated manual API fetch setup is removed from non-admin app composables where it can be replaced safely within this scope.
- [x] #4 No files owned by the admin workspace or hackathon page refactor tasks are modified.
- [x] #5 `bun run lint`, `bun run typecheck`, and `bun run test:unit` pass, or any inability to run them is recorded in the task summary.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approved implementation plan:
1. Add a shared app-side API data-fetching composable layer in app/composables that wraps Nuxt-managed data APIs for relative `/api/**` reads, preserves SSR request context, supports stable explicit keys, and keeps Nuxt cancellation/dedupe behavior intact.
2. Keep the layer scoped to read-side data composables and typed API response envelopes; avoid admin workspace coupling and route-template changes.
3. Migrate safe non-admin app composables/utilities that currently hand-roll `useRequestFetch`/`$fetch` read setup onto the shared layer, leaving route pages, useAdminWorkspace, account/admin panels, and database/server code untouched.
4. Leave mutation-heavy workspaces on direct action fetches unless a narrow read-path adoption stays inside this task's scope.
5. Add focused tests if practical for wrapper behavior such as key handling, response unwrapping, and SSR fetch selection at the wrapper boundary.
6. Run `bun run lint`, `bun run typecheck`, and `bun run test:unit`; report any validation limitation without marking the task Done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Coordinator started worker `agent-fetch-core`. Write ownership: shared app API data-fetching composable layer and non-admin app composables/utilities that can adopt it safely. Do not touch hackathon page templates, admin workspace files, server routes, database code, or broad UI lazy-loading work.

Coordinator/user approved the TASK-291.2 plan. Worker may proceed within stated write ownership.

Implemented a shared app fetch layer in `app/composables/useApiData.ts` using Nuxt 4.4 `createUseAsyncData` and `createUseFetch` defaults (`dedupe: cancel`, shallow refs) plus SSR-aware request fetch selection for `/api` reads. Migrated non-admin composables within write ownership: `useCurrentPlatformDocuments`, `useSessionActor`, `useParticipantApplication`, `useHackathonParticipationWorkspace`, `usePrizeRedemptionWorkspace`, `useShellNavigation`, and `useUserHackathons`. Added focused unit coverage in `tests/unit/app/composables/useApiData.test.ts` and updated `useCurrentPlatformDocuments` tests. Validation status: `bun run lint` passed, `bun run test:unit` passed, and `bun run typecheck` remains blocked by an unrelated existing error in `server/utils/prize-redemptions.ts:237`, outside this task’s write ownership.

Coordinator review complete. Hegel's earlier typecheck blocker was caused by in-progress TASK-291.3 edits and is resolved in the integrated worktree. No remaining TASK-291.2 blockers.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a shared Nuxt 4.4 data-fetching layer in `app/composables/useApiData.ts` using `createUseFetch` and `createUseAsyncData`, with shallow refs and cancel dedupe defaults. Migrated safe non-admin composable reads onto the shared layer while leaving route pages, admin workspace code, server code, and database code untouched for this task. Added focused unit coverage for the wrapper and current platform document caller. Validation passed in the integrated worktree: `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
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
