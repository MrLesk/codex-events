---
id: TASK-353
title: Remove configurable Luma webhook URL
status: Done
assignee:
  - codex
created_date: '2026-05-31 20:18'
updated_date: '2026-05-31 20:29'
labels:
  - luma
  - settings
  - config
dependencies: []
modified_files:
  - shared/domains/luma/webhook-url.ts
  - tools/luma/webhook-bootstrap.ts
  - tools/deploy/generate-wrangler-config.ts
  - .github/workflows/deploy-test.yml
  - .github/workflows/deploy-production.yml
  - .env.example
  - OPERATOR.md
  - DEVELOPMENT.md
  - server/api/platform-settings/debug.get.ts
  - app/pages/account/platform-settings.vue
  - app/components/account/AccountPlatformDebugPanel.vue
  - tests/unit/tools/luma/webhook-bootstrap.test.ts
  - tests/unit/tools/deploy/generate-wrangler-config.test.ts
  - tests/integration/server/api/platform-settings-debug-routes.test.ts
priority: medium
ordinal: 53000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The Luma webhook callback URL is part of the platform integration contract and should not be operator-configurable through environment variables. The application and deployment tooling should derive it from the app base domain, documentation should stop instructing operators to set a custom Luma webhook URL, and platform admins should be able to view the derived webhook URL as debug information in Platform settings.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The custom Luma webhook URL environment override is no longer read by deployment or Luma webhook bootstrap tooling.
- [x] #2 Operator, development, and example environment docs no longer list or instruct users to set a custom Luma webhook URL.
- [x] #3 Platform settings includes a non-editable debug view showing the derived Luma webhook URL.
- [x] #4 Relevant unit tests are updated to cover the fixed derived Luma webhook URL behavior and the platform settings debug response/UI.
- [x] #5 Required validation commands are run and any unrelated existing blockers are reported.
<!-- AC:END -->



## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a shared Luma webhook URL builder that derives `/api/public/luma/webhooks` from the app base URL.
2. Remove custom Luma webhook URL override reads from Luma webhook bootstrap, deploy config generation, and GitHub workflows; update unit tests to assert derivation from `NUXT_AUTH0_APP_BASE_URL` / `BASE_DOMAIN` only.
3. Remove documentation and `.env.example` references that tell operators or contributors to set a custom Luma webhook URL, while keeping the derived webhook path described where useful.
4. Add a platform-admin-only debug API endpoint returning the derived Luma webhook URL from runtime config.
5. Add a new Platform settings `Debug information` tab backed by a focused `AccountPlatformDebugPanel` component.
6. Run targeted tests plus required validation before committing and pushing.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented the fixed Luma webhook URL model by removing the custom webhook URL override from tooling, deploy workflows, .env.example, and docs. Added shared URL derivation, a platform-admin debug API route, and a Platform settings Debug information tab that displays the derived webhook URL. Validation: lint, typecheck, unit tests, integration tests, and git diff --check pass. BDD was attempted and remains blocked before scenarios by the existing fixture score CHECK constraint failure in tests/bdd/support/platform-fixtures.ts.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Removed operator control over the Luma webhook callback URL. The Luma webhook bootstrap now always derives the callback from the configured app base URL, deploy workflows no longer pass a custom webhook URL variable, and deploy config generation no longer carries a custom webhook URL field. Documentation and .env.example no longer instruct operators or contributors to set that URL.

Added a platform-admin-only debug endpoint and a new Platform settings Debug information tab that shows the derived Luma webhook URL as read-only operational information. Added tests for the fixed derivation behavior and debug route authorization/response. Validation passed for lint, typecheck, unit tests, integration tests, and diff whitespace checks; BDD was attempted but remains blocked by the existing judge score fixture/schema mismatch before scenarios run.
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
