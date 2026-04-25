---
id: TASK-291.3
title: Push database hot-path filtering into D1 queries
status: Done
assignee:
  - agent-db-hotpaths
created_date: '2026-04-25 20:44'
updated_date: '2026-04-25 20:59'
labels:
  - database
  - performance
dependencies: []
references:
  - AGENT-SPAWN-NOTES.md
documentation:
  - docs/README.md
  - docs/domain-model.md
parent_task_id: TASK-291
priority: high
ordinal: 1300
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Tighten the database access patterns called out in the release-readiness review. Scope is limited to schema/index additions, explicit migrations, and server query code for prize redemptions, prize eligibility snapshots, audit log reads, and team directory listing. Do not modify Nuxt page data-fetching code or client components.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Pending prize redemption reads filter by the requesting actor and status in the database rather than loading all pending redemptions first.
- [x] #2 Prize eligibility snapshot lookups used by public participant flows have a supporting index for their query shape.
- [x] #3 Audit log endpoints apply hackathon filtering and reasonable result limits in the database query rather than unbounded loads plus JavaScript filtering.
- [x] #4 Team directory listing avoids loading all teams and members when query predicates and pagination can be represented in the database layer.
- [x] #5 Schema changes include an explicit migration and relevant tests are added or updated for changed query behavior.
- [x] #6 `bun run lint`, `bun run typecheck`, and `bun run test:unit` pass, or any inability to run them is recorded in the task summary.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approved implementation plan:
1. Add targeted D1 indexes in server/database/schema.ts and explicit migrations for prize_redemptions recipient/status hot paths, prize_eligibility_snapshots public lookup shape, and audit_logs hackathon-scoped reads where the schema supports them.
2. Refactor server/utils/prize-redemptions.ts so pending prize redemption reads filter in SQL rather than loading all pending rows and filtering in JavaScript.
3. Refactor audit endpoints so database-side ordering/limits are applied and hackathon entity-scope filtering is pushed into the query where supported.
4. Refactor server/utils/team-formation.ts so team directory predicates and pagination run in D1/Drizzle as far as the current schema allows while preserving existing filterCounts behavior.
5. Update focused schema/query tests for the changed behavior.
6. Run `bun run lint`, `bun run typecheck`, and `bun run test:unit`; report any validation limitation without marking the task Done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Coordinator started worker `agent-db-hotpaths`. Write ownership: database schema/migrations/tests and server query code for prize redemptions, prize eligibility snapshots, audit reads, and team directory listing. Do not touch Nuxt page data-fetching, app composables, client components, or server import-convention cleanup.

Coordinator/user approved the TASK-291.3 plan. Worker may proceed within stated write ownership.

Implementation started for D1 hot-path filtering/index work. Scope remains limited to schema/migration updates, server query code for prize redemptions, prize-eligibility snapshot lookups, audit reads, team directory listing, and focused tests.

Continuing implementation after mid-task status check. Remaining owned scope: explicit migration, SQL-side prize redemption filtering, DB-side audit filtering/limits, SQL-side team directory predicates/pagination where practical, focused tests, and required validation.

Implemented TASK-291.3 within owned scope without touching Nuxt app/page/composable code. Added explicit D1 indexes and migration for prize redemptions, prize eligibility snapshots, and audit reads; moved pending prize-redemption filtering into Drizzle; pushed hackathon audit filtering and read limits into SQLite via entity predicates plus json_extract(metadata, '$.hackathonId'); and refactored team directory listing to apply predicates, counts, pagination, and totals in D1 where practical.

Validation completed on final code: `bun run lint` passed, `bun run typecheck` passed, `bun run test:unit` passed. Focused integration coverage also passed via `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/team-formation-routes.test.ts tests/integration/server/api/outcome-routes.test.ts`.

Canonical docs were reviewed and confirmed unchanged for this task. Task intentionally remains In Progress for coordinator review/finalization; no commit was created.

Coordinator review complete. Integrated validation passed, including focused integration route tests. Audit endpoints now return a capped result set with `total` representing returned rows; this matches the current unpaginated endpoint shape and should be revisited if audit pagination becomes a product requirement.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added D1 indexes and migration `drizzle/0045_database_hot_path_indexes.sql` for prize redemption, prize eligibility snapshot, and audit-log hot paths. Refactored pending prize redemption lookup, audit reads, and team directory listing so filtering, ordering, limits, and pagination happen in the database where practical while preserving current API behavior. Added/updated focused schema, redemption, audit, and team-formation tests. Validation passed: `bun run lint`, `bun run typecheck`, `bun run test:unit`, and focused integration tests for `team-formation-routes` and `outcome-routes`.
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
