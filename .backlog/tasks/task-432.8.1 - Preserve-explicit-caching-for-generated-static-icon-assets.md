---
id: TASK-432.8.1
title: Preserve explicit caching for generated static icon assets
status: Done
assignee:
  - '@luna-architecture'
created_date: '2026-08-20 23:17'
updated_date: '2026-08-20 23:34'
labels: []
dependencies: []
parent_task_id: TASK-432.8
priority: high
type: bug
ordinal: 146000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The centralized fail-closed API cache classifier correctly protects actor and product data, but it currently classifies Nuxt's generated /api/_nuxt_icon/** JSON as protected. These responses contain only bundled static icon definitions and already carry long-lived framework cache headers. The boundary must preserve this narrow non-sensitive static family and keep remote protected-cache telemetry from treating its harmless HITs as data leaks.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 /api/_nuxt_icon/** is the only generated framework API asset family explicitly exempted from protected no-store defaults
- [x] #2 Static icon responses preserve their framework cache headers and remain free of actor, authorization, D1, or deployment-specific data
- [x] #3 Protected API browser telemetry excludes the static icon family but still fails on HIT or Age for every actor and product-data API
- [x] #4 Unit and integration tests prove unknown /api/_nuxt_* and all other non-allowlisted API routes fail closed
- [x] #5 Architecture and test guidance distinguish static framework assets from public product contracts and protected APIs
<!-- AC:END -->

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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a separately named static-framework classifier for the exact /api/_nuxt_icon/<name>.json contract, preserving trailing-slash normalization without changing the explicit public product allowlist.
2. Make the centralized beforeResponse policy preserve static icon event and returned Response headers, while all unknown generated-framework and product API paths remain protected no-store.
3. Add classifier, centralized runtime/returned-Response, and browser telemetry tests for the allowlist and fail-closed boundaries.
4. Update cache/testing architecture guidance to distinguish static framework assets from public product contracts and protected APIs, then run focused and repository validation.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Post-deploy SHA 7c9b63f5: /api/session and platform data APIs returned private,no-store with no CF-Cache-Status/Age. /api/_nuxt_icon/lucide.json returned a harmless old CF HIT with Age 1356, but the Nitro policy also rewrote its visible headers to private,no-store. This is a performance regression and a telemetry false positive, not a data disclosure.

Implemented the exact static-framework contract /api/_nuxt_icon/<name>.json. Nested icon paths, the directory path, and other /api/_nuxt_* families remain protected no-store; the static branch preserves generated Response cache headers and contains only a static icon payload in integration coverage.
Validation: focused classifier/topology unit tests passed (5 tests); cache-policy integration passed (7 tests); full integration passed (43 files, 467 tests); lint and typecheck passed; account-workspace browser topology passed (22 scenarios). The full unit suite passed 157/159 files and 1063/1068 tests; its 5 failures are in concurrent TASK-432.10 placement-related queue/consumer tests and were not changed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented the narrow static-framework cache exception for exact /api/_nuxt_icon/<name>.json responses. The centralized policy now preserves generated icon headers and the browser cache classifier excludes only that static family in addition to existing public contracts; nested, unknown, and all other actor/product API paths remain protected no-store. Updated cache architecture/testing guidance and added classifier, runtime Response, fail-closed, and browser telemetry coverage. Verified with focused tests, full integration, lint, typecheck, and 22 account-workspace browser scenarios; the only remaining full-suite failures are unrelated concurrent TASK-432.10 placement tests.
<!-- SECTION:FINAL_SUMMARY:END -->
