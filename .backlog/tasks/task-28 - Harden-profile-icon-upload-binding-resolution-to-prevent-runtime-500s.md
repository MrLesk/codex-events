---
id: TASK-28
title: Harden profile icon upload binding resolution to prevent runtime 500s
status: Done
assignee: []
created_date: '2026-03-26 21:23'
updated_date: '2026-03-26 21:31'
labels:
  - bug
  - runtime
  - account
  - profile-icon
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Investigate and fix profile icon upload failures returning 500 in runtime environments where the R2 binding is not reliably attached on `event.context.cloudflare.env` despite local configuration. Ensure upload path resolves an injected/fallback bucket consistently and returns actionable error details when unavailable.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Uploading a valid PNG/JPEG profile icon succeeds when running local dev with wrangler-backed bindings.
- [x] #2 Profile icon APIs resolve R2 bucket even when request env is partially populated and middleware must inject fallback runtime bindings.
- [x] #3 When bucket is unavailable, API error includes actionable details (configured binding and available env keys) without exposing secrets.
- [x] #4 Unit/integration tests cover fallback binding-resolution behavior and continue to pass existing profile-icon route tests.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reproduce upload failure path in local runtime and isolate whether the failure is in request parsing, D1 write path, or R2 binding resolution.
2. Harden profile-icon bucket resolution to support injected runtime bucket and safe fallback to default PROFILE_ICONS when configured binding is unavailable.
3. Update local binding middleware to inject a concrete profile icon bucket into request context and map fallback proxy binding when runtime env is partial.
4. Add unit coverage for fallback and injected-bucket behavior and preserve existing profile-icon integration route coverage.
5. Run focused validation (unit, integration, eslint on changed files, and typecheck) and summarize remaining risk.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Confirmed route integration test passes in harness; failure likely runtime/env attachment edge case rather than core upload logic.

Verified local wrangler proxy exposes PROFILE_ICONS and supports put/get/delete operations.

Implemented resilient bucket resolution in server/utils/profile-icons.ts with injected bucket support and default-binding fallback plus safe available-binding diagnostics.

Updated server/middleware/local-d1-binding.ts to inject resolved profileIconsBucket and map fallback proxy binding when configured key is missing.

Added unit tests for fallback and injected-bucket behavior in tests/unit/server/utils/profile-icons.test.ts; reran unit, integration, eslint, and typecheck successfully.

Ran a direct headless Playwright browser check using saved authenticated session and captured upload network responses; reproduced the real failure as 500 `internal_error` with message `false == true`.

Identified concrete root cause: Wrangler local R2 proxy assertion failure when `R2Bucket.put()` receives a Node `Buffer`; multipart upload data arrived as Buffer in runtime path.

Fixed by normalizing upload payload to plain `Uint8Array` in `putProfileIconObject` before `bucket.put`, and added unit coverage to prevent regression.

Re-ran direct browser upload check after fix; upload returned HTTP 200 and UI success toast appeared.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Hardened profile-icon upload runtime behavior and fixed a concrete local-runtime failure causing 500 responses.

What changed:
- Updated `server/utils/profile-icons.ts` to resolve the bucket from (1) configured binding, (2) middleware-injected `event.context.profileIconsBucket`, and (3) safe fallback `PROFILE_ICONS` binding when configured name is unavailable.
- Added strict R2-bucket shape checks and improved `profile_icons_binding_missing` error details to include configured/fallback binding names and only R2-like available env keys (no secret values).
- Updated `server/middleware/local-d1-binding.ts` to resolve profile-icon bucket from existing env or wrangler proxy fallback and inject the resolved bucket into request context.
- Fixed root runtime bug in `putProfileIconObject`: normalize multipart payload data to plain `Uint8Array` before `R2Bucket.put()` so Wrangler local R2 proxy does not throw internal assertion `false == true` on Node `Buffer` values.
- Added unit coverage in `tests/unit/server/utils/profile-icons.test.ts` for fallback binding behavior, middleware-injected bucket behavior, error detail shape, and Buffer normalization.

Validation:
- `bun x vitest run tests/unit/server/utils/profile-icons.test.ts`
- `bun x vitest run --config vitest.integration.config.ts tests/integration/server/api/actor-platform-routes.test.ts -t "profile-icon account routes upload, read, and remove the caller profile icon"`
- `bun x eslint server/utils/profile-icons.ts tests/unit/server/utils/profile-icons.test.ts`
- `bun run typecheck`
- Direct headless browser verification against local app (`/account/settings`) using saved authenticated session: profile icon upload POST returned 200 and success toast displayed.

Risks / follow-ups:
- The discovered Buffer-specific failure was observed in local Wrangler R2 proxy behavior. Production Cloudflare runtime may not exhibit the same assertion, but normalization keeps behavior consistent across local and remote runtimes.
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
