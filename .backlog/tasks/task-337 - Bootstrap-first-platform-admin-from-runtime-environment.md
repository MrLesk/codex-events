---
id: TASK-337
title: Bootstrap first platform admin from runtime environment
status: Done
assignee:
  - Codex
created_date: '2026-05-30 21:22'
updated_date: '2026-05-30 21:29'
labels:
  - auth
  - deployment
  - documentation
dependencies: []
modified_files:
  - .env.example
  - .github/workflows/ci.yml
  - .github/workflows/release-production.yml
  - DEVELOPMENT.md
  - OPERATOR-ADVANCED.md
  - OPERATOR.md
  - nuxt.config.ts
  - server/auth/actor.ts
  - server/api/account/registration.post.ts
  - server/domains/accounts/index.ts
  - server/domains/platform/admins.ts
  - tests/integration/server/api/actor-platform-routes.test.ts
  - tests/support/backend/api-route.ts
  - tests/unit/tools/deploy/generate-wrangler-config.test.ts
  - tools/deploy/generate-wrangler-config.ts
priority: medium
ordinal: 40000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Allow operators to configure the first platform admin by email through deployment/runtime configuration instead of manually running a SQL update. The application should use the existing audited platform-admin grant behavior, promote the configured email only when no active platform admins exist, and support both first registration and an already-registered matching account on the next authenticated request.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Operators can set a documented runtime environment variable for the first platform admin email.
- [x] #2 When a matching platform account exists and no active platform admins exist, the app grants platform-admin access through the existing audited domain path.
- [x] #3 The bootstrap is idempotent and does not re-grant the configured email while another active platform admin exists.
- [x] #4 Production and shared dev deployment config pass the environment variable through to the Worker runtime.
- [x] #5 Operator, advanced operator, development, and environment example docs no longer instruct operators to run a manual SQL update for first-admin setup.
- [x] #6 Relevant unit or integration tests cover the runtime bootstrap behavior and deployment config output.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add server-only runtime config `firstPlatformAdminEmail`, pass `NUXT_FIRST_PLATFORM_ADMIN_EMAIL` through generated Wrangler config, and wire the production/dev workflows to read the GitHub environment variable.
2. Add a platform-admin domain helper that compares the configured email case-insensitively, checks that no active platform admins exist, then calls the existing audited `grantPlatformAdminAccess` path.
3. Invoke the helper during account registration and authenticated actor resolution so both newly registered and already registered matching accounts can be bootstrapped without SQL.
4. Update `.env.example`, `OPERATOR.md`, `OPERATOR-ADVANCED.md`, and `DEVELOPMENT.md` to document the env variable and replace the manual SQL setup step.
5. Add integration/unit coverage for registration/session bootstrap behavior and deploy config output, then run targeted and project validation.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented runtime first-platform-admin bootstrap with NUXT_FIRST_PLATFORM_ADMIN_EMAIL. The app promotes the matching active platform account only when no active platform admins exist, using grantPlatformAdminAccess with audit action platform_admin.first_bootstrap_granted. The promotion runs during account registration and authenticated actor resolution so it works for new and already-registered accounts. Validation passed: bunx vitest run tests/unit/tools/deploy/generate-wrangler-config.test.ts; bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/actor-platform-routes.test.ts; bun run lint; bun run typecheck; bun run test:unit; bun run test:integration; git diff --check -- ':!.agents/**'. Attempted bun run test:bdd; it failed while applying existing BDD fixture SQL because tests/bdd/support/platform-fixtures.ts seeds judge_criterion_scores values above the current 1-5 score CHECK constraint. That fixture file was not modified in this task.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
## Summary

- Added `NUXT_FIRST_PLATFORM_ADMIN_EMAIL` as the operator/runtime setting for first platform-admin bootstrap.
- Wired the setting through Nuxt runtime config, generated Wrangler config, production release, and shared dev deployment workflows.
- Added an audited runtime grant path that promotes the configured email only when no active platform admins exist, and calls it during account registration and authenticated session resolution.
- Updated operator/development docs and `.env.example` so setup no longer requires a manual D1 SQL update.
- Added tests for new-account registration bootstrap, existing-account session bootstrap, no-op behavior when another admin exists, and deploy config output.

## Validation

- bunx vitest run tests/unit/tools/deploy/generate-wrangler-config.test.ts
- bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/actor-platform-routes.test.ts
- bun run lint
- bun run typecheck
- bun run test:unit
- bun run test:integration
- git diff --check -- ':!.agents/**'

## BDD Note

`bun run test:bdd` was attempted and failed before browser execution while applying existing fixture SQL: the BDD fixture seeds `judge_criterion_scores.score` values above the current 1-5 CHECK constraint. `tests/bdd/support/platform-fixtures.ts` was not modified in this task.
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
