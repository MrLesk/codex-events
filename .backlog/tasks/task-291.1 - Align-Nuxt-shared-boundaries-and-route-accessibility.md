---
id: TASK-291.1
title: Align Nuxt shared boundaries and route accessibility
status: Done
assignee:
  - agent-nuxt-boundaries
created_date: '2026-04-25 20:44'
updated_date: '2026-04-25 20:59'
labels:
  - nuxt
  - accessibility
dependencies: []
references:
  - AGENT-SPAWN-NOTES.md
documentation:
  - docs/README.md
  - docs/domain-model.md
  - 'https://nuxt.com/blog/v4'
  - 'https://nuxt.com/blog/v4-4'
  - 'https://nuxt.com/docs/4.x/api/components/nuxt-route-announcer'
parent_task_id: TASK-291
priority: high
ordinal: 1100
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Bring app-level Nuxt structure in line with Nuxt 4 conventions without changing product behavior. Scope is limited to shared pure helpers used by both app and server code plus root app accessibility wiring. Do not modify data-fetching pages, admin workspace files, database schema, or server query logic.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 No server file imports runtime code from the app directory for auth navigation helpers.
- [x] #2 App and server callers use a shared helper module for auth return-to and account navigation URLs.
- [x] #3 The root Nuxt app includes the appropriate Nuxt route accessibility announcer component without changing visible layout.
- [x] #4 Existing navigation behavior and auth redirect URLs are preserved.
- [x] #5 `bun run lint`, `bun run typecheck`, and `bun run test:unit` pass, or any inability to run them is recorded in the task summary.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approved implementation plan:
1. Move pure auth-navigation helpers currently shared by app and server into a shared runtime module.
2. Update app callers and the two server callers so server code no longer imports from app runtime code.
3. Add the Nuxt route accessibility announcer in app/app.vue without changing visible layout.
4. Preserve existing auth redirect URL behavior; add or adjust focused tests only if needed to lock that behavior.
5. Run `bun run lint`, `bun run typecheck`, and `bun run test:unit`; report any validation limitation without marking the task Done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Coordinator started worker `agent-nuxt-boundaries`. Write ownership: shared auth navigation helper module, app auth-navigation import updates, server imports that currently reference app auth-navigation, and app/app.vue route accessibility wiring. Do not touch data-fetching pages, admin workspace files, database code, or broad server convention cleanup.

Discovery summary (2026-04-25): current boundary violations are limited to `server/utils/platform-account-linking.ts` and `server/middleware/dashboard-auth.ts`, both importing pure auth URL helpers from `app/utils/auth-navigation.ts`. The pure helpers are also used by app pages/components/composables, while `resolveActorAppRedirect` remains app-only. `app/app.vue` currently renders `NuxtLoadingIndicator`, `NuxtLayout`, `NuxtPage`, and `UiSonner` without a route announcer. Planned implementation is pending user approval before code edits per backlog workflow.

Coordinator/user approved the TASK-291.1 plan. Worker may proceed within stated write ownership.

Implementation complete (2026-04-25): extracted pure auth URL constants/builders into `shared/auth-navigation.ts`, updated owned app callers to import the shared helper directly, and updated `server/utils/platform-account-linking.ts` plus `server/middleware/dashboard-auth.ts` so no server code imports `app/` runtime auth helpers. Kept `resolveActorAppRedirect` in `app/utils/auth-navigation.ts` as app-only logic. Added `<NuxtRouteAnnouncer />` to `app/app.vue` without layout changes. Updated focused auth-navigation unit coverage to exercise the shared helper plus app redirect logic.

Validation (2026-04-25): focused `bun x vitest run tests/unit/app/utils/auth-navigation.test.ts tests/unit/app/utils/navigation-guards.test.ts tests/unit/server/routes/auth/account-linking.test.ts` passed, and required repo checks `bun run lint`, `bun run typecheck`, and `bun run test:unit` all passed. Canonical docs unchanged for this task.

Coordinator review complete. Integrated validation passed after merging active worker changes: `bun run lint`, `bun run typecheck`, `bun run test:unit`. No remaining TASK-291.1 blockers.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Moved pure auth navigation helpers into `shared/auth-navigation.ts`, updated app and server imports so server code no longer reaches into app runtime modules, and added `<NuxtRouteAnnouncer />` to the root Nuxt app. Existing auth redirect helper behavior is covered by the updated auth-navigation unit tests. Validation passed: `bun run lint`, `bun run typecheck`, `bun run test:unit`, plus focused auth/navigation tests run by the worker.
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
