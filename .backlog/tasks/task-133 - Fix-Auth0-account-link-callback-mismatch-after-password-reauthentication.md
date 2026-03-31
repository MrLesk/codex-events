---
id: TASK-133
title: Fix Auth0 account-link callback mismatch after password reauthentication
status: Done
assignee: []
created_date: '2026-03-31 18:37'
updated_date: '2026-03-31 18:40'
labels:
  - auth0
  - account-linking
  - bug
dependencies: []
documentation:
  - docs/api-surface.md
  - docs/domain-model.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A participant who already has a password-backed platform account can be sent through the existing-account linking flow after signing in with Google, but the flow currently fails with a mismatch error even when they enter the correct password account credentials. Fix the account-link callback so a successful password reauthentication completes the link instead of reading stale session state from the callback request.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Signing in with Google for an email that already has a password-backed platform account can be completed by reauthenticating with that existing password account once.
- [x] #2 The account-link flow validates the reauthenticated password account without depending on stale session data from the same callback request.
- [x] #3 Expired, invalid, and wrong-account link attempts continue to resolve to the existing account-link error states.
- [x] #4 Automated tests cover the successful linking path and the stale-session regression.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reproduce the account-link mismatch path in the Auth0 link callback.
2. Move post-login subject verification and Management API linking into a fresh request after Auth0 writes the updated session cookie.
3. Add regression coverage for successful reauthentication and mismatch handling, then run repo validation.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Confirmed the callback was reading stale Auth0 session state from the same request that called completeInteractiveLogin, so the code still saw the original Google identity and redirected with linkingError=mismatch.

Implemented a fresh /auth/link/complete handoff so the existing-account password session is validated in a new request before calling the Auth0 Management API link endpoint.

Docs and runtime config were unchanged for this fix; behavior now matches the existing documented account-link model.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed the Auth0 existing-account linking flow so password reauthentication is validated in a fresh request instead of reading stale session state from the callback request. `/auth/link/callback` now completes the Auth0 login and redirects to a new `/auth/link/complete` route, which reads the updated session cookie, verifies the expected password-backed subject, performs the Management API identity link, and preserves the existing expired/invalid/login_failed/mismatch/failed redirects.

Updated route-level unit coverage to assert the fresh-request handoff, the successful Google-to-password linking path, and the wrong-account mismatch branch. Validation passed with `bun run lint` (existing `vue/no-v-html` warnings only), `bun run typecheck`, and `bun run test:unit`.

Risk is low and localized to the account-link route flow. The only functional change is the extra internal redirect to `/auth/link/complete` before returning the user to `/account/register`.
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
