---
id: TASK-344
title: Fix Auth0 verification domain and button contrast automation
status: Done
assignee:
  - codex
created_date: '2026-05-31 17:38'
updated_date: '2026-05-31 17:41'
labels:
  - auth0
  - deployment
dependencies: []
modified_files:
  - tools/auth0/auth0-bootstrap.ts
  - tests/unit/tools/auth0/auth0-bootstrap.test.ts
priority: medium
ordinal: 47000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Auth0 email verification currently exposes two tenant-setup issues: verification links use the canonical Auth0 domain unless the custom domain is selected as the default notification domain, and the hosted verification success button can render unreadable text when only the legacy primary branding color is configured. The tenant bootstrap should enforce both settings.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Auth0 bootstrap apply/check treats the configured custom domain as the default domain used for Auth0-generated notification links when the custom domain is ready.
- [x] #2 Auth0 bootstrap apply/check configures the default branding theme primary button and primary button label colors so hosted verification buttons have readable contrast.
- [x] #3 The implementation uses Auth0 Management API endpoints for default custom domains and branding themes, without relying on dashboard-only state.
- [x] #4 Unit tests cover the expected Auth0 config defaults and generated Universal Login branding theme behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend Auth0 bootstrap config with a derived primary button label color that contrasts with the configured primary button color.
2. Add Management API helpers for the default branding theme, and enforce primary_button / primary_button_label in apply/check mode.
3. Update custom-domain bootstrap to set the configured ready custom domain through PATCH /api/v2/custom-domains/default and check is_default drift.
4. Add focused unit coverage for the derived button label color and Universal Login template/branding expectations, then run lint, typecheck, unit tests, integration tests, and diff checks.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented Auth0 bootstrap enforcement for two verification-flow tenant settings. Ready custom domains are now set through PATCH /api/v2/custom-domains/default and checked via is_default so Auth0-generated verification links use the custom domain. The bootstrap also updates the default branding theme through /api/v2/branding/themes/default and PATCH /api/v2/branding/themes/{themeId}, setting primary_button and a derived primary_button_label color for readable hosted verification buttons.

Validation: bun run lint passed; bun run typecheck passed; bun run test:unit passed; bun run test:integration passed; git diff --check passed. bun run test:bdd was attempted and remains blocked during fixture bootstrap by existing judge_criterion_scores fixture values outside the current 1-5 schema constraint.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated Auth0 tenant bootstrap to enforce the custom domain as the default notification domain once it is ready, so Auth0-generated email verification links use the configured custom domain instead of the canonical tenant domain. Also added default branding theme enforcement for primary_button and primary_button_label so hosted Auth0 buttons, including email verification completion buttons, have readable contrast with the configured primary color.

Added focused unit coverage for derived button label color and config defaults. Validation passed for lint, typecheck, unit tests, integration tests, and diff whitespace checks. BDD was attempted but remains blocked before browser execution by an existing fixture/schema mismatch: BDD fixture SQL inserts judge criterion scores outside the current 1-5 score constraint.
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
