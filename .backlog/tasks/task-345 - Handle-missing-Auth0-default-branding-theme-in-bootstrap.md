---
id: TASK-345
title: Handle missing Auth0 default branding theme in bootstrap
status: Done
assignee:
  - codex
created_date: '2026-05-31 18:04'
updated_date: '2026-05-31 18:30'
labels:
  - auth0
  - ci
dependencies: []
modified_files:
  - tools/auth0/auth0-bootstrap.ts
  - tests/unit/tools/auth0/auth0-bootstrap.test.ts
priority: high
ordinal: 48000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The Auth0 bootstrap enforces Universal Login button colors through /api/v2/branding/themes/default. Some tenants return 404 theme_not_found until a default branding theme is materialized. Apply mode should create the missing default theme using Auth0's branding theme create endpoint and then verify it; check mode should report the missing theme as drift.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Auth0 bootstrap apply mode creates/materializes the default branding theme when /api/v2/branding/themes/default returns the known 404 theme_not_found response, then verifies configured button colors.
- [x] #2 Auth0 bootstrap check mode treats the known missing default branding theme as configuration drift instead of warning and succeeding.
- [x] #3 Auth0 bootstrap still patches and verifies default branding theme button colors when the theme endpoint is already available.
- [x] #4 Universal Login page template CSS includes a readable primary button label color as a fallback for hosted Auth0 screens covered by the template.
- [x] #5 Unit tests cover the missing-theme classification, theme creation payload, and template button-label color fallback.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Replace the missing-default-theme warning path with a convergence path: apply mode creates/materializes a default Auth0 branding theme using the Management API create-theme endpoint, then verifies colors through the default-theme endpoint.
2. Keep check mode strict by recording a drift failure when the default branding theme is missing instead of treating the tenant as passing.
3. Preserve the Universal Login template button label color fallback because it protects the hosted page template while the theme state converges.
4. Add focused unit coverage for missing-theme classification, the create-theme payload, and the template CSS fallback, then run lint, typecheck, unit, integration, BDD attempt, and diff checks before committing.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Reopened after review feedback: warning-only handling for Auth0 /api/v2/branding/themes/default 404 theme_not_found was too weak because it let CI pass without converging the tenant. The revised implementation creates the missing default branding theme in apply mode, verifies through the default-theme endpoint, and records check-mode drift when the default theme is missing.

Validation after the revised convergence fix: bun run lint passed; bun run typecheck passed; bun run test:unit passed; bun run test:integration passed; git diff --check passed. bun run test:bdd was attempted and remains blocked before scenarios run by the existing BDD fixture issue: wrangler D1 fixture import fails with CHECK constraint failed: score in tests/bdd/support/platform-fixtures.ts.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Changed the Auth0 bootstrap so the known /api/v2/branding/themes/default 404 theme_not_found state is converged instead of skipped. In apply mode, the bootstrap now creates a complete default branding theme through POST /api/v2/branding/themes, then reads /api/v2/branding/themes/default again and verifies the configured primary_button and primary_button_label colors. In check mode, the same missing-theme state is reported as drift.

Kept the Universal Login page template button-label CSS fallback, added unit coverage for missing-theme detection and the default theme create payload, and confirmed the deploy workflows run the Auth0 bootstrap in apply mode. Validation passed for lint, typecheck, unit tests, integration tests, and diff whitespace checks. BDD was attempted but remains blocked by the existing fixture/schema mismatch for judge criterion scores before any scenario runs.
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
