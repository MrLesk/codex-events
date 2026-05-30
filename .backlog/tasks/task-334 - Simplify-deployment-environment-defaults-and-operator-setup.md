---
id: TASK-334
title: Simplify deployment environment defaults and operator setup
status: Done
assignee: []
created_date: '2026-05-30 21:06'
updated_date: '2026-05-30 21:06'
labels:
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
  - 'server/api/public/events/[slug]/photos/index.get.ts'
  - server/domains/applications/luma-sync-queue.ts
  - server/domains/applications/review-email-queue.ts
  - server/domains/events/photos.ts
  - server/domains/outcomes/email-queue.ts
  - tests/integration/server/api/event-routes.test.ts
  - tests/support/backend/api-route.ts
  - tests/unit/server/domains/applications/luma-sync-queue.test.ts
  - tests/unit/server/domains/applications/review-email-queue.test.ts
  - tests/unit/server/domains/events/photos.test.ts
  - tests/unit/server/domains/outcomes/email-queue.test.ts
  - tests/unit/server/utils/cloudflare-queue-routing.test.ts
  - tests/unit/tools/deploy/ensure-d1-database.test.ts
  - tests/unit/tools/deploy/ensure-r2-buckets.test.ts
  - tests/unit/tools/deploy/generate-wrangler-config.test.ts
  - tests/unit/tools/deploy/reconcile-queue-consumers.test.ts
  - tools/auth0/auth0-custom-domain.ts
  - tools/deploy/generate-wrangler-config.ts
priority: medium
ordinal: 37000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Align deployment automation and operator documentation around environment-scoped defaults. The deploy generator should derive Cloudflare resource names as <resource-prefix>-<environment> for every target, dev and production should both automate Auth0 custom-domain DNS verification, public event image CDN configuration should be removed, and operator docs should focus on required setup rather than internal workflow details.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Default Cloudflare resource names always include the environment after the resource prefix, including production.
- [x] #2 Shared dev and production deployment workflows both run Auth0 custom-domain and DNS verification automation before Auth0 application bootstrap.
- [x] #3 Public event image CDN deployment/runtime configuration is removed; public event image URLs are served through Worker routes.
- [x] #4 Operator documentation lists required GitHub variables and secrets clearly and omits internal queue-consumer implementation details.
- [x] #5 Relevant unit, integration, lint, typecheck, and whitespace validations pass or have unrelated blockers documented.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Validation completed before commit: bunx vitest run tests/unit/tools/auth0-custom-domain.test.ts; bunx vitest run tests/unit/server/domains/events/photos.test.ts tests/unit/tools/deploy/generate-wrangler-config.test.ts; bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/event-routes.test.ts; bun run lint -- --ignore-pattern '.agents/**'; bun run typecheck; bun run test:unit; bun run test:integration; git diff --check -- ':!.agents/**'. Raw bun run lint remains blocked by unrelated dirty .agents/skills files in the worktree.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented one deployment cleanup batch: resource defaults now use <DEPLOY_RESOURCE_PREFIX>-<DEPLOY_ENV_NAME> for all environments, dev runs the same Auth0 custom-domain DNS verification automation as production, public event image CDN config was removed in favor of Worker-served public image routes, and operator/development docs were simplified accordingly. Validation run: targeted Auth0/deploy/photo tests, lint excluding unrelated .agents changes, typecheck, unit tests, integration tests, and scoped diff whitespace checks.
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
