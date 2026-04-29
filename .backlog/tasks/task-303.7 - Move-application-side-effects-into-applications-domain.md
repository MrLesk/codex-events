---
id: TASK-303.7
title: Move application side effects into applications domain
status: Done
assignee:
  - Codex
created_date: '2026-04-29 17:41'
updated_date: '2026-04-29 17:43'
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
  - server/domains/applications/luma-sync-queue.ts
  - server/domains/applications/review-email-queue.ts
  - server/domains/applications/review-emails.ts
  - server/utils/application-luma-sync-queue.ts
  - server/utils/application-review-email-queue.ts
  - server/utils/application-review-emails.ts
  - server/plugins/application-luma-sync-queue.ts
  - server/plugins/application-review-email-queue.ts
  - server/plugins/hackathon-outcome-email-queue.ts
  - server/middleware/99.application-luma-sync-startup-recovery.ts
  - server/utils/luma-webhooks.ts
  - tests/unit/server/domains/applications/luma-sync-queue.test.ts
  - tests/unit/server/domains/applications/review-email-queue.test.ts
  - tests/unit/server/domains/applications/review-emails.test.ts
parent_task_id: TASK-303
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Move application Luma sync queue and application review email delivery logic out of generic server utilities into the applications domain. Preserve plugin, middleware, and route behavior while making application-owned side effects explicit.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Application Luma sync queue, review email queue, and review email content/delivery logic live under the server applications domain rather than generic server utilities.
- [x] #2 Routes, plugins, middleware, and related server modules import application side-effect modules from the applications domain directly, with no compatibility aliases for old utility paths.
- [x] #3 Tests covering application Luma sync and review email behavior are moved or updated to match the new domain layout.
- [x] #4 The refactor preserves behavior and passes required validation: lint, typecheck, unit tests, and relevant application integration tests where applicable.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Move application-luma-sync-queue.ts, application-review-email-queue.ts, and application-review-emails.ts from server/utils into server/domains/applications with shorter side-effect filenames.
2. Update routes, plugins, middleware, luma webhook helpers, and tests to import the applications domain side-effect modules directly.
3. Update moved modules to keep infrastructure dependencies such as outbound-email under server/utils.
4. Move unit tests into tests/unit/server/domains/applications and update relative imports.
5. Run targeted application queue/email tests, then bun run lint, bun run typecheck, and bun run test:unit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Moved application-owned Luma sync and review email side-effect modules into server/domains/applications with shorter names. Updated routes, plugins, middleware, Luma webhook helpers, and tests to import the domain modules directly; no old application side-effect utility paths remain.

Validation passed: bunx vitest run tests/unit/server/domains/applications/luma-sync-queue.test.ts tests/unit/server/domains/applications/review-email-queue.test.ts tests/unit/server/domains/applications/review-emails.test.ts; bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/application-routes.test.ts tests/integration/server/api/admin-luma-backfill-routes.test.ts tests/integration/server/api/public-luma-webhook-routes.test.ts; bun run lint; bun run typecheck; bun run test:unit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Moved application-owned side-effect modules from server/utils into server/domains/applications: luma-sync-queue.ts, review-email-queue.ts, and review-emails.ts. Updated routes, plugins, middleware, Luma webhook helpers, and unit tests to import these modules from the applications domain directly, while keeping outbound email transport as infrastructure under server/utils.

Validation passed: targeted application queue/email unit tests; targeted application/Luma integration route tests; bun run lint; bun run typecheck; bun run test:unit. Docs/config were confirmed unchanged because this is behavior-preserving module-boundary work.
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
