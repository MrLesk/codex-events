---
id: TASK-58
title: Stabilize profile icon rendering and cache versioned icon responses
status: Done
assignee:
  - Codex
created_date: '2026-03-28 14:16'
updated_date: '2026-03-28 14:18'
labels:
  - bug
  - ux
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fix the platform-user profile icon experience so known uploaded icons render without a fallback flash and repeated uses of the same versioned icon URL do not trigger redundant network fetches. This covers the shared avatar rendering used by the header menu and account settings plus the authenticated profile-icon response behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Platform users with an uploaded profile icon see their image rendered directly in shared avatar surfaces without first showing the generic fallback.
- [x] #2 Repeated use of the same versioned `/api/account/profile-icon?v=...` URL on a page can reuse a cached response instead of forcing duplicate network loads.
- [x] #3 Profile icon upload and removal behavior continue to work for header and settings surfaces.
- [x] #4 Automated tests cover the updated authenticated profile-icon response behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the shared AppAvatar rendering so a known profile icon src displays directly while fallback content remains available only when no src exists.
2. Change the authenticated profile icon GET response to use cache headers compatible with the existing versioned `?v=` URL so repeated uses on the same page can reuse the response.
3. Extend the existing profile icon route integration test to assert the cache behavior, then run `bun run test:unit` and a targeted integration test if practical.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Replaced the shared AppAvatar fallback-first image path with direct native image rendering when a known src is present, while preserving fallback behavior when no icon exists or the image request fails.

Updated authenticated profile icon responses to use private immutable caching and added a user-scoped versioned icon href helper so the header and account settings can reuse the same cached asset safely.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated shared profile icon rendering so known uploaded icons render directly in AppAvatar instead of flashing the initials/icon fallback first. Added a small `buildProfileIconHref` helper and used it in both the shell header and account settings so profile icon URLs are user-scoped and consistently versioned.

Changed `GET /api/account/profile-icon` to return `Cache-Control: private, max-age=31536000, immutable` with `Vary: Cookie`, which allows repeated uses of the same authenticated versioned icon URL on a page to reuse the browser cache instead of forcing duplicate fetches.

Validation: `bun run test:unit`; `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/actor-platform-routes.test.ts -t "profile-icon account routes upload, read, and remove the caller profile icon"`.

Risks/follow-ups: no known functional follow-up is required for this change; if avatar flicker is still reported elsewhere, the next place to inspect is delayed actor hydration rather than the avatar/image path itself.
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
