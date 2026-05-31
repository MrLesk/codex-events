---
id: TASK-345
title: Handle missing Auth0 default branding theme in bootstrap
status: Done
assignee:
  - codex
created_date: '2026-05-31 18:04'
updated_date: '2026-05-31 18:06'
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
The Auth0 bootstrap started calling /api/v2/branding/themes/default to enforce primary button label contrast, but some tenants return 404 theme_not_found when the default theme has not been materialized. The bootstrap should keep CI passing in that tenant state while still applying button-label contrast where Auth0 supports it.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Auth0 bootstrap does not fail apply/check when /api/v2/branding/themes/default returns the known 404 theme_not_found response.
- [x] #2 Auth0 bootstrap still enforces default branding theme button colors when the theme endpoint is available.
- [x] #3 Universal Login page template CSS includes a readable primary button label color as a fallback for hosted Auth0 screens covered by the template.
- [x] #4 Unit tests cover the known 404 theme_not_found handling and the template button-label color fallback.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a helper that recognizes the known Auth0 branding theme 404/theme_not_found response.
2. Make default branding theme retrieval return null for that known response and skip theme enforcement with a warning instead of failing CI.
3. Add primary button label CSS to the Universal Login page template as a fallback for hosted screens covered by the template.
4. Add focused unit tests, then run lint, typecheck, unit tests, integration tests, BDD attempt, and diff checks before committing.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented the CI fix by recognizing the known Auth0 /api/v2/branding/themes/default 404 theme_not_found response and skipping default-theme color sync with a warning. Existing tenants that expose the default branding theme still get primary_button and primary_button_label enforcement. Added Universal Login template CSS for primary button label color as a fallback for hosted screens covered by the template.

Validation: bun run lint passed; bun run typecheck passed; bun run test:unit passed; bun run test:integration passed; git diff --check passed. bun run test:bdd was attempted and remains blocked during fixture bootstrap by existing judge_criterion_scores fixture values outside the current 1-5 schema constraint.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed the Auth0 bootstrap regression that broke CI on tenants where /api/v2/branding/themes/default returns 404 theme_not_found because the default theme has not been materialized. The bootstrap now treats that known response as skippable, logs a warning, and continues; tenants with an available default theme still receive primary button and primary button label color enforcement.

Added Universal Login template CSS for primary button label contrast as a fallback for hosted Auth0 screens covered by the page template, and added unit coverage for both the skippable 404 detection and the template color rule. Validation passed for lint, typecheck, unit tests, integration tests, and diff whitespace checks. BDD was attempted but remains blocked by the existing fixture/schema mismatch for judge criterion scores.
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
