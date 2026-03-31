---
id: TASK-131
title: Apply low-risk Nuxt and D1 performance optimizations
status: Done
assignee:
  - codex
created_date: '2026-03-31 17:39'
updated_date: '2026-03-31 17:55'
labels: []
dependencies: []
documentation:
  - docs/tech-stack.md
  - docs/testing-strategy.md
  - docs/api-surface.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Improve request and page performance without changing product behavior. Scope is limited to low-risk optimizations identified during the performance audit: add missing D1 indexes for hot query patterns, cache request-local authorization lookups so the same request does not re-query actor and role state, and replace repeated in-memory linear joins in user participation loading with map-based lookups. Do not change API response shapes, permissions, lifecycle guards, or user-visible workflow behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Add D1 indexes for hot lookup patterns used by current auth, role, judging, and prize queries without changing runtime behavior
- [x] #2 Cache request-local hackathon, team, and judge-assignment authorization lookups so repeated checks in one request avoid duplicate D1 reads
- [x] #3 Refactor user participation loading to use map-based lookups instead of repeated linear scans while preserving the existing response shape
- [x] #4 Keep all existing route contracts and permission checks unchanged
- [x] #5 Validate the changes with lint, typecheck, and unit tests and run targeted integration coverage for affected server routes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add low-risk secondary indexes in the Drizzle schema and create a migration for hot query patterns that currently filter by user-scoped role/application data, active memberships, active judge assignments, and prize-by-hackathon reads.
2. Extend H3 event context and auth helpers with request-local caches for resolved hackathon authorization, team authorization, and judge-assignment authorization so repeated checks within one request reuse the same result.
3. Refactor account hackathon participation loading to build lookup maps once instead of repeatedly scanning arrays when assembling the response payload.
4. Run targeted integration tests for judging and account participation paths, then run lint, typecheck, and unit tests. Keep API contracts and permission semantics unchanged.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
User approved the low-risk optimization path only: indexes, request-local caching, and in-memory lookup cleanup.

Implemented low-risk optimizations in the current worktree: added secondary indexes in schema plus drizzle/0021_safe_performance_indexes.sql, added request-local caches for hackathon/team/judge-assignment authorization results on H3 event context, replaced repeated linear participation lookups in server/api/account/hackathons.get.ts with maps, reduced current platform-document loading to one query, and reused linkable platform-account identity lookup within a request for actor resolution and /auth/link/login.

Validation: full lint now passes with existing vue/no-v-html warnings only, typecheck passed, unit tests passed, and targeted integration passed for tests/integration/server/auth/authorization-foundation.test.ts and tests/integration/server/api/actor-platform-routes.test.ts in addition to the earlier affected route coverage.

Remaining larger wins would require API or workspace-loading consolidation and are intentionally deferred as higher risk.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Applied the low-risk performance set without changing product behavior: direct slug lookups for participant/team workspaces, batched judging assignment expansion, request-local authorization and linkable-identity caching, one-query current platform-document loading, map-based account participation assembly, and new D1 secondary indexes with migration coverage. Validation passed with bun run lint, bun run typecheck, bun run test:unit, and targeted integration coverage for auth, actor/platform routes, judging, hackathon routes, and migration behavior.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [x] #4 Tests were added or updated when behavior changed
- [ ] #5 Test gaps are documented when automation is not practical
- [x] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
- [x] #9 No practical test gaps remained after unit plus targeted integration coverage
<!-- DOD:END -->
