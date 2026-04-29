---
id: TASK-303.8
title: Move outcome notification side effects into outcomes domain
status: Done
assignee:
  - Codex
created_date: '2026-04-29 17:44'
updated_date: '2026-04-29 17:45'
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
  - server/domains/outcomes/email-queue.ts
  - server/domains/outcomes/emails.ts
  - server/utils/hackathon-outcome-email-queue.ts
  - server/utils/hackathon-outcome-emails.ts
  - server/plugins/application-luma-sync-queue.ts
  - server/plugins/application-review-email-queue.ts
  - server/plugins/hackathon-outcome-email-queue.ts
  - tests/unit/server/domains/outcomes/email-queue.test.ts
  - tests/unit/server/domains/outcomes/emails.test.ts
parent_task_id: TASK-303
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Move shortlist and winner notification email queue/content logic out of generic server utilities into the outcomes domain. Preserve route and queue plugin behavior while making outcome-owned side effects explicit.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Outcome notification email queue and content/delivery logic live under the server outcomes domain rather than generic server utilities.
- [x] #2 Lifecycle action routes, queue plugins, and related server modules import outcome notification modules from the outcomes domain directly, with no compatibility aliases for old utility paths.
- [x] #3 Tests covering outcome email queue and delivery behavior are moved or updated to match the outcomes domain layout.
- [x] #4 The refactor preserves behavior and passes required validation: lint, typecheck, unit tests, and relevant outcome route integration tests where applicable.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Move hackathon-outcome-email-queue.ts and hackathon-outcome-emails.ts from server/utils into server/domains/outcomes as email-queue.ts and emails.ts.
2. Update lifecycle action routes, plugins, and tests to import outcome notification modules from #server/domains/outcomes/*.
3. Update moved modules to keep outbound-email as an infrastructure dependency from server/utils.
4. Move unit tests into tests/unit/server/domains/outcomes and update relative imports.
5. Run targeted outcome email tests and outcome integration tests, then bun run lint, bun run typecheck, and bun run test:unit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Moved shortlist/winner notification email queue and content modules into server/domains/outcomes. Updated lifecycle action routes, queue plugins, and tests to import outcome notification modules from the outcomes domain; no old outcome email utility paths remain.

Validation passed: bunx vitest run tests/unit/server/domains/outcomes/email-queue.test.ts tests/unit/server/domains/outcomes/emails.test.ts; bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/outcome-routes.test.ts; bun run lint; bun run typecheck; bun run test:unit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Moved outcome-owned notification side effects from server/utils into server/domains/outcomes: email-queue.ts and emails.ts. Updated lifecycle action routes, queue plugins, and unit tests to import these modules from the outcomes domain directly, while keeping outbound email transport under server/utils.

Validation passed: targeted outcome email unit tests; targeted outcome route integration tests; bun run lint; bun run typecheck; bun run test:unit. Docs/config were confirmed unchanged because this is behavior-preserving module-boundary work.
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
