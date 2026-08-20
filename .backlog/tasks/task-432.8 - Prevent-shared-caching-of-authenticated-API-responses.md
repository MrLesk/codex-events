---
id: TASK-432.8
title: Prevent shared caching of authenticated API responses
status: Done
assignee:
  - '@luna-architecture'
created_date: '2026-08-20 22:33'
updated_date: '2026-08-20 22:59'
labels: []
dependencies: []
parent_task_id: TASK-432
priority: high
type: bug
ordinal: 143000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Authenticated API responses on the deployed test domain are being stored and replayed by Cloudflare. During TASK-432 verification, an unauthenticated curl to /api/session returned the previously authenticated 200 response with CF-Cache-Status: HIT and an increasing Age header. Protected API responses must fail closed and real latency evidence must measure Worker/D1 execution rather than shared cached actor data.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Every /api/session, /api/account/**, /api/admin/**, and other authenticated API response explicitly prevents browser and shared-edge storage
- [x] #2 An unauthenticated request to /api/session returns the canonical unauthenticated response and can never receive another actor's payload
- [x] #3 Automated tests cover cache directives for successful and error responses across protected API route families
- [x] #4 Real-browser performance checks distinguish protected Worker execution from browser or edge cache reuse
- [x] #5 Canonical architecture, testing guidance, and root agent guardrails make protected response caching a reviewable regression
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
1. Reproduce and locate the pre-Worker cache boundary and Nitro response lifecycle. 2. Disable Workers cache in the tracked and generated deployment configurations. 3. Add one centralized fail-closed protected-response cache policy while preserving the explicit public/versioned allowlist. 4. Add runtime, source/config, and real-browser topology regression coverage. 5. Update canonical docs, operator edge-smoke guidance, and root agent guardrails. 6. Run local validation and commit; leave remote deploy, purge, and edge smoke verification to the explicit release gate.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Deployed SHA 77fa4ddf: authenticated Settings cold request /api/session ~974ms and page-shaped Settings ~6800ms. Repeat requests were ~20-30ms only because Cloudflare returned shared HIT responses. With Chrome cache disabled, both still returned CF-Cache-Status: HIT with Age ~245-252. An unauthenticated curl to https://test.codex-events.com/api/session returned HTTP 200, CF-Cache-Status: HIT, Age 325, and the authenticated X-D1-Bookmark.

Root cause confirmed before the Worker boundary: the tracked wrangler.jsonc and generated deployment configs enabled Workers cache globally. Cookie was not part of the shared cache key, so a Cloudflare HIT could bypass Nitro and replay authenticated /api/session data to an unauthenticated request. The fix disables cache.enabled in the tracked and generated config paths and keeps the centralized Nitro beforeResponse fail-closed policy for protected API responses, including returned Response bodies and handled errors.

Validation after the config and header changes: focused cache/config/topology unit tests 14 passed; focused cache integration 5 passed; lint passed; typecheck passed; unit 158 files/1060 tests passed; integration 41 files/461 tests passed; full BDD 85 regular plus 2 destructive scenarios passed; focused account-workspace browser topology 22 passed; Cloudflare build passed; git diff --check passed.

Remote edge verification was intentionally not run: this worker was instructed not to push, deploy, or purge remote objects. OPERATOR.md now contains the safe opt-in manual smoke-test strategy for authenticated then unauthenticated /api/session, Cookie isolation, CF-Cache-Status/Age, public cache controls, and Cache Rules/origin no-store review.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented TASK-432.8. Disabled Cloudflare Workers cache in wrangler.jsonc and generated deployment configuration, centralized fail-closed protected API response headers at the Nitro boundary, preserved the explicit public/versioned allowlist, added runtime/config/source/browser regression coverage, and documented Cache Rules plus the read-only remote smoke gate. Local validation is green; no remote deploy or purge was performed.
<!-- SECTION:FINAL_SUMMARY:END -->
