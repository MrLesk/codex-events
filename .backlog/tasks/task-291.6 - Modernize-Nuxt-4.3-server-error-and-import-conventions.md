---
id: TASK-291.6
title: Modernize Nuxt 4.3 server error and import conventions
status: Done
assignee:
  - '@agent-server-conventions'
created_date: '2026-04-25 20:45'
updated_date: '2026-04-25 21:33'
labels:
  - nuxt
  - server
dependencies:
  - TASK-291.1
  - TASK-291.3
references:
  - AGENT-SPAWN-NOTES.md
documentation:
  - docs/README.md
  - docs/domain-model.md
  - 'https://nuxt.com/blog/v4-3'
  - 'https://nuxt.com/docs/4.x/api/nuxt-config'
parent_task_id: TASK-291
priority: medium
ordinal: 1700
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Clean up framework-convention issues in server code after database hot-path edits have landed. Scope is limited to Nuxt/H3 error option names and server import paths; do not change endpoint behavior, query semantics, or client code.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Runtime errors created for Nuxt/H3 responses use the current status/statusText naming where supported by the project dependency versions.
- [x] #2 Server API/routes/utils use Nuxt 4.3 server alias imports where that improves readability and does not create circular imports.
- [x] #3 Endpoint response shapes and thrown error behavior remain unchanged from a caller point of view.
- [x] #4 This task does not overlap with active database query rewrites and is started only after those changes are integrated.
- [x] #5 `bun run lint`, `bun run typecheck`, and `bun run test:unit` pass, or any inability to run them is recorded in the task summary.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Coordinator-approved plan:
1. Inspect Nuxt 4.3 release notes and current project dependency behavior for supported server error/status naming and server import aliases.
2. Apply mechanical server-only convention cleanup where it improves readability and does not change endpoint behavior or query semantics.
3. Keep changes limited to server import paths and H3/Nuxt error option naming; do not alter database schema, migrations, query predicates, API response shapes, or client code.
4. Prefer small, reviewable edits and skip any file where alias/import changes create ambiguity or circular risk.
5. Run `bun run lint`, `bun run typecheck`, and `bun run test:unit`; report results to the coordinator without committing or marking the task Done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Coordinator approved starting after TASK-291.1, TASK-291.3, and TASK-291.5 completed. This lane is intentionally server-only and can run in parallel with TASK-291.7 because write scopes do not overlap. Worker must not commit or mark Done; coordinator will review and finalize.

Implemented server convention cleanup without changing endpoint response shapes: converted the remaining direct H3 `createError` option names in `server/routes/auth/bdd-login.ts`, replaced relative imports with `#server` imports in bounded DB-hot-path API route files, and added matching `#server` alias resolution to Vitest configs for direct route-handler tests. Validation passed: `bun run lint`, `bun run typecheck`, `bun run test:unit`, plus focused integration `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/outcome-routes.test.ts tests/integration/server/api/submission-routes.test.ts`.

Coordinator reviewed and accepted the server convention patch. Remaining `statusCode` references in server are custom `ApiError`/domain error contracts or provider metadata, not direct H3 `createError` calls. Integrated validation passed after merging with the UI lazy-loading lane: `bun run lint`, `bun run typecheck`, `bun run test:unit`, and focused integration for outcome, submission, and team-formation routes.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Modernized bounded server conventions without changing caller-visible behavior.

Key changes:
- Converted the remaining direct server `createError` usage to current H3 `status` / `statusText` option names.
- Replaced relative imports with `#server` imports in bounded API route files touched by the release-readiness work where the alias improves readability.
- Added `#server` alias resolution to Vitest configs so direct route-handler tests can resolve the same imports.

Validation passed:
- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`
- `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/outcome-routes.test.ts tests/integration/server/api/submission-routes.test.ts tests/integration/server/api/team-formation-routes.test.ts`

Risks/follow-ups:
- No product docs were changed; behavior and response shapes remain the same.
- Remaining `statusCode` references are custom/domain error contracts or provider metadata, not direct H3 `createError` option objects.
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
