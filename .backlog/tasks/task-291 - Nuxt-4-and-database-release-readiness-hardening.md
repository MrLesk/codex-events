---
id: TASK-291
title: Nuxt 4 and database release-readiness hardening
status: Done
assignee: []
created_date: '2026-04-25 20:44'
updated_date: '2026-04-25 21:33'
labels:
  - nuxt
  - database
  - release-readiness
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
  - 'https://nuxt.com/blog/v4'
  - 'https://nuxt.com/blog/v4-1'
  - 'https://nuxt.com/blog/v4-2'
  - 'https://nuxt.com/blog/v4-3'
  - 'https://nuxt.com/blog/v4-4'
  - 'https://nuxt.com/docs/4.x/getting-started/data-fetching'
priority: high
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Prepare the platform for stricter external review by aligning Nuxt usage, data-fetching patterns, server/shared boundaries, and database hot paths with the current canonical product model and Nuxt 4.4 capabilities. This parent groups independently deliverable cleanup tasks; each child task has explicit ownership to avoid concurrent edits in the same files.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Nuxt data-fetching code uses framework-managed composables where SSR payload transfer matters.
- [x] #2 Shared code boundaries are clear between app, server, and shared runtime code.
- [x] #3 Known database hot paths avoid in-memory filtering where query predicates can be pushed to D1.
- [x] #4 Heavy admin UI work is split so hidden panels do not eagerly load unnecessary data or client code.
- [x] #5 All child tasks pass the required project validation before being marked done.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Coordinator plan approved on 2026-04-25:

Active parallel lane, non-overlapping write scopes:
1. TASK-291.1 / agent-nuxt-boundaries: shared auth-navigation boundary and root route announcer only.
2. TASK-291.2 / agent-fetch-core: shared app API data-fetching composable layer and safe non-admin app composable adoption only.
3. TASK-291.3 / agent-db-hotpaths: D1 indexes/migrations and server query hot-path optimization only.

Queued dependency lane:
4. TASK-291.4 starts after TASK-291.2 lands; scope is public route-level hackathon fetches.
5. TASK-291.5 starts after TASK-291.2 lands; scope is account hackathon admin workspace eager loading.
6. TASK-291.7 starts after TASK-291.5 lands; scope is lazy-loading heavy UI panels.
7. TASK-291.6 starts after TASK-291.1 and TASK-291.3 land; scope is server error/import convention cleanup.

Workers do not commit or mark tasks Done. Coordinator reviews returned changes, runs integrated validation, updates acceptance criteria, and finalizes tasks.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Completed active parallel lane: TASK-291.1, TASK-291.2, and TASK-291.3. Parent remains In Progress because route-level fetch refactor, admin workspace eager-loading, lazy UI loading, and server convention cleanup are still queued by dependency.

Started next approved non-overlapping lane: TASK-291.4 public route fetch refactor and TASK-291.5 account/admin workspace eager-loading. TASK-291.6 remains parked to avoid broad server-file overlap; TASK-291.7 remains blocked on TASK-291.5.

User clarified coordinator responsibility: the coordinator must review and approve worker plans rather than asking the user for routine per-lane approval. Going forward, coordinator will approve plans that stay within recorded task scope and only pause for user input on scope/product/architecture changes.

TASK-291.5 is Done. Account/admin workspace data loading now uses scoped Nuxt async data/fetch behavior, including tab-gated account datasets and admin workspace load flags. Parent AC #4 remains open until TASK-291.7 handles client-code/component lazy loading; parent AC #5 remains open until all child validations are complete.

Started final approved parallel lane after TASK-291.5: Socrates owns TASK-291.7 UI lazy loading; Planck owns TASK-291.6 server-only convention cleanup. Write scopes are intentionally separate to avoid collisions. Coordinator will review returned changes, run integrated validation, and finalize tasks.

All child tasks are Done after coordinator review. Final integrated validation passed across the full working tree: `bun run lint`, `bun run typecheck`, `bun run test:unit`, and focused integrations for outcome, submission, and team-formation routes. No canonical docs changed because product behavior and permissions stayed aligned with docs; changes are framework usage, fetch/query efficiency, and loading behavior hardening.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed the Nuxt 4 and database release-readiness hardening pass.

Child task outcomes:
- TASK-291.1 clarified shared/app/server auth-navigation boundaries and added the Nuxt route announcer.
- TASK-291.2 introduced Nuxt-managed API data composables and migrated reusable app fetch paths.
- TASK-291.3 pushed database hot-path filtering into D1 queries and added supporting indexes/migration.
- TASK-291.4 moved public hackathon route setup fetches onto Nuxt data composables.
- TASK-291.5 reduced account/admin workspace eager data loading and replaced submission monitor per-team fan-out with one admin bulk endpoint.
- TASK-291.6 modernized bounded server convention usage with `#server` imports and current H3 `createError` option names where applicable.
- TASK-291.7 lazy-loaded heavy account/admin UI panels and deferred client-only Sortable/editor loading.

Validation passed:
- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`
- `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/outcome-routes.test.ts tests/integration/server/api/submission-routes.test.ts tests/integration/server/api/team-formation-routes.test.ts`

No product docs or configuration/operator docs needed changes beyond test alias config, because the product model, permissions, and API contracts stayed intact. Remaining risk is mainly runtime UX observation for lazy-loaded panels in a browser; compile/type/unit/integration coverage is green.
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
