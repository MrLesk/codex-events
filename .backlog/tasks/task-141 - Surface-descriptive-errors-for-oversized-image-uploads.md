---
id: TASK-141
title: Surface descriptive errors for oversized image uploads
status: Done
assignee:
  - codex
created_date: '2026-03-31 21:05'
updated_date: '2026-03-31 21:19'
labels:
  - bug
  - ux
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fix the actor-facing image upload experience so oversized uploads show the platform's canonical API error message instead of a generic raw 400 error. This investigation found that the profile icon upload flow already receives a structured `profile_icon_file_too_large` API response from the server, but the account settings page bypasses shared API error normalization and can surface the raw fetch error string instead.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Oversized profile icon uploads show the canonical API error message from the server instead of a generic raw 400 error.
- [x] #2 Existing profile icon upload success behavior and existing invalid-file error handling continue to work.
- [x] #3 Automated coverage protects the oversized profile icon error-handling path.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the account settings profile icon upload handler to normalize API errors through the shared `normalizeApiError` helper instead of rendering the raw fetch error string.
2. Add or update automated coverage for the actor-facing profile icon upload error path so oversized uploads and existing invalid-file failures continue to surface canonical messages.
3. Run targeted tests for profile icon API and UI-adjacent logic, then run the required repo validation commands (`bun run lint`, `bun run typecheck`, `bun run test:unit`).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Investigation found that `/api/account/profile-icon` already returns `profile_icon_file_too_large` for oversized uploads in integration coverage, but `app/pages/account/settings.vue` currently assigns `error.message` directly in the upload catch block. Admin hackathon image uploads already use `normalizeApiError(error).message`.

Updated `app/pages/account/settings.vue` to route profile icon upload failures through `normalizeApiError`, matching the existing admin upload pattern and surfacing canonical API messages such as `profile_icon_file_too_large` instead of the raw fetch status string.

Added unit coverage in `tests/unit/app/utils/admin-workspace.test.ts` to verify fetch-style upload errors with nested API payloads resolve to the canonical message.

Validation completed successfully: `bun test tests/unit/app/utils/admin-workspace.test.ts`, `bun run lint`, `bun run typecheck`, and `bun run test:unit` all passed. Canonical docs and configuration were unchanged.

Follow-up after task closure: corrected the shared hackathon managed-image upload copy in `app/components/admin/HackathonConfigForm.vue` from `1mb` to `5MB` so the admin-facing background and banner guidance matches the canonical `hackathonImageMaxBytes` server limit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aligned the account settings profile icon upload flow with the repository's existing API error-handling pattern. The page now uses `normalizeApiError(error).message` for upload failures, so oversized uploads surface the server's descriptive canonical message instead of a generic raw `400 Bad Request` string.

Added focused unit coverage for `normalizeApiError` using a fetch-style nested API error payload shaped like the profile icon upload failure. This protects the regression without expanding scope into unrelated upload flows.

Also corrected the shared hackathon background and banner upload copy to say `JPG/PNG up to 5MB`, matching the canonical server-side limit for hackathon images.

Validation run:
- `bun test tests/unit/app/utils/admin-workspace.test.ts`
- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`

No canonical docs or config changes were required.
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
