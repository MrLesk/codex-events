---
id: TASK-291.5
title: Reduce account hackathon admin workspace eager loading
status: Done
assignee:
  - codex-coordinator
created_date: '2026-04-25 20:45'
updated_date: '2026-04-25 21:22'
labels:
  - nuxt
  - performance
  - admin-workspace
dependencies:
  - TASK-291.2
references:
  - AGENT-SPAWN-NOTES.md
documentation:
  - docs/README.md
  - docs/domain-model.md
  - 'https://nuxt.com/docs/4.x/getting-started/data-fetching'
parent_task_id: TASK-291
priority: high
ordinal: 1500
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make the account hackathon workspace load data according to the active workspace needs instead of eagerly starting every admin, judging, roster, team, and leaderboard request on entry. Scope is limited to the account hackathon workspace page, its admin workspace composable, and directly owned admin workspace panel calls. Do not touch public route pages, database schema, or unrelated shared UI components.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Entering the account hackathon workspace no longer starts all admin workspace API requests before the user opens the relevant tab or panel.
- [x] #2 The active tab still receives the data it needs on initial render and existing refresh behavior remains coherent for visible panels.
- [x] #3 Submission/team monitoring avoids per-team request fan-out where a bulk endpoint or existing list response can provide the same information.
- [x] #4 Existing permission gates and role-specific visibility stay unchanged.
- [x] #5 `bun run lint`, `bun run typecheck`, and `bun run test:unit` pass, or any inability to run them is recorded in the task summary.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approved implementation plan:
1. Refactor the account hackathon workspace and admin workspace composable so data requests are started according to visible active-tab/panel needs rather than eagerly loading every admin dataset on entry.
2. Preserve initial render behavior for the active tab, existing permission gates, and role-specific visibility.
3. Reduce submission/team monitoring request fan-out by reusing existing list data or adding a narrowly scoped bulk API read only if the current server surface cannot provide the same information.
4. Do not modify public hackathon route pages, database schema/migrations, shared fetch-core implementation, broad server convention cleanup, or lazy UI component loading for hidden panels.
5. Run `bun run lint`, `bun run typecheck`, and `bun run test:unit`; run focused integration tests if a server endpoint changes; report any validation limitation without marking the task Done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Coordinator/user approved starting TASK-291.5 after TASK-291.2 completion. Worker owns account/admin workspace eager-loading and any narrowly scoped server endpoint needed for request fan-out reduction.

Coordinator replaced silent worker Goodall after repeated missed status checks and no observed file changes. Task remains In Progress; replacement worker will continue same approved scope.

Replacement worker Kuhn returned no changed files and requested help. Coordinator is pausing TASK-291.5 until TASK-291.4 lands, then will either handle locally or spawn a narrower worker with concrete file targets.

After two failed worker attempts, coordinator is taking TASK-291.5 locally as the blocking path. Future worker use will be limited to narrower dependent tasks after this task lands.

Coordinator completed local implementation after worker handoff failures. Account workspace tab-only datasets now load via Nuxt async data only when their tabs need them; admin settings/operations panels pass explicit load flags into the admin workspace composable; the submissions admin panel uses one admin-only bulk submission monitor endpoint instead of per-team detail/submission request fan-out. Canonical docs were checked and did not require changes because behavior and permissions stayed aligned with the existing domain model. Validation passed: bun run lint, bun run typecheck, bun run test:unit, and bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/submission-routes.test.ts.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented scoped eager-loading reductions for the account hackathon workspace and admin panels.

Key changes:
- Added load flags to `useAdminWorkspace` / `useAdminHackathonWorkspace` so admin datasets are fetched only when the visible panel needs them, while preserving visible-panel refresh behavior.
- Updated account hackathon tab-only data so judge/staff rosters, completed prize results, published projects, and participation rank load through Nuxt async data only for the active relevant tab.
- Added an admin-only `/api/hackathons/:hackathonId/teams/submission-monitor` bulk endpoint and switched the submissions operations panel away from 2N per-team detail/submission calls.
- Added integration coverage for the bulk submission monitor endpoint.

Validation passed:
- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`
- `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/submission-routes.test.ts`

Risks/follow-ups:
- No canonical docs or config changes were needed.
- Lazy UI component loading remains in `TASK-291.7`; this task only reduced data/API eager loading.
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
