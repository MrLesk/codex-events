---
id: TASK-300
title: Introduce server domain module layout
status: Done
assignee:
  - Codex
created_date: '2026-04-29 16:57'
updated_date: '2026-04-29 17:04'
labels:
  - architecture
  - server
  - refactor
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
  - docs/api-surface.md
modified_files:
  - server/http/api-error.ts
  - server/http/api-handler.ts
  - server/http/api-response.ts
  - server/http/validation.ts
  - server/domains/applications/index.ts
  - tests/integration/server/http/api-handler.test.ts
  - tests/unit/server/domains/applications/index.test.ts
  - tests/unit/server/http/api-error.test.ts
  - tests/unit/server/http/api-response.test.ts
  - tests/unit/server/http/validation.test.ts
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Reorganize server-side business logic away from the generic `server/utils` bucket into explicit domain and technical modules. Keep route behavior unchanged and migrate in conservative slices so ownership becomes clearer without broad churn.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Server-side HTTP-only helpers have an explicit non-domain home outside `server/utils`.
- [x] #2 At least one cohesive server business domain is moved under `server/domains/*` with imports updated to the new canonical path.
- [x] #3 Nuxt server routes remain thin adapters and public API behavior remains unchanged.
- [x] #4 The task records the intended domain module boundaries for follow-up refactors.
- [x] #5 Required repository validation passes with `bun run lint`, `bun run typecheck`, and `bun run test:unit`; integration tests are run for touched server routes when relevant.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Move HTTP adapter helpers from `server/utils` into `server/http` and update imports.
2. Move the applications business module into `server/domains/applications` and update application-route and dependent imports.
3. Keep Nuxt `server/api` files as thin route adapters; do not change request or response contracts.
4. Record the remaining intended server module boundaries for follow-up work.
5. Run required validation and focused integration coverage for application routes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Initial server boundary map:
- `server/http`: API error type, handler wrapper, response envelope helpers, request validation/parsing.
- `server/domains/applications`: application submission, application listing, approval/rejection, user application status, and application-related Luma sync toggles.
- Follow-up domain candidates: `hackathons`, `teams`, `submissions`, `judging`, `outcomes`, `prizes`, `media`, `feedback`, `platform-account`.
- Integration candidates outside domains: `integrations/luma`, `integrations/email`, `integrations/cloudflare`.
- Technical infrastructure candidates outside domains: `database`, `auth`, `http`, queue routing/runtime plumbing.

Implemented first server slice: HTTP adapter helpers now live under `server/http`, and application business logic now lives under `server/domains/applications`. Server route files remain Nuxt adapters with import-only changes. TASK-301 tracks the separate client/Vue module-layout follow-up.

Validation passed: `bunx vitest run tests/unit/server/http tests/unit/server/domains/applications`; `bunx vitest run --config vitest.integration.config.ts tests/integration/server/http/api-handler.test.ts tests/integration/server/api/application-routes.test.ts`; `bun run lint`; `bun run typecheck`; `bun run test:unit`; `bun run test:integration`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Introduced the first server domain module layout slice. HTTP-only API helpers moved from `server/utils` to `server/http`, application business logic moved to `server/domains/applications`, route adapters and dependent server modules now import the canonical paths, and related server tests moved to matching `server/http` and `server/domains` test namespaces. Public API behavior is unchanged; the change is structural. TASK-301 remains open for the client/Vue side.
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
