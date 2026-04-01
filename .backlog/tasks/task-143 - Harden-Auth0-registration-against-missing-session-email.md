---
id: TASK-143
title: Harden Auth0 registration against missing session email
status: Done
assignee:
  - codex
created_date: '2026-04-01 06:37'
updated_date: '2026-04-01 06:40'
labels: []
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/security-analysis.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Ensure the GitHub/Auth0 login path makes the required email scope explicit and that account registration fails with a clear user-facing message when Auth0 does not return an email claim. This is a follow-up to the GitHub social-login autofill work and should keep the canonical requirement that platform account registration depends on an authenticated identity email.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 GitHub login initiation explicitly requests the email scope needed for platform account registration.
- [x] #2 Account registration surfaces a clear error when the authenticated identity does not expose an email address.
- [x] #3 Automated tests cover the explicit GitHub login scope and the missing-email registration path.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the custom GitHub Auth0 login route to request the email scope explicitly alongside the GitHub connection so the registration flow does not rely on implicit defaults.
2. Keep the existing server-side email requirement for platform-account registration, but surface a clear actor-facing error on /account/register when the Auth0 session has no email.
3. Add or update narrow tests for the GitHub login route, registration API behavior without email, and the account-registration helper or page logic as needed.
4. Run lint, typecheck, and unit tests before finalizing the task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Made the GitHub Auth0 login route request both `openid profile email` and GitHub `user:email` explicitly so email availability does not depend on implicit defaults.

Kept the existing server-side `identity_email_unavailable` guard and added account-registration UX handling so missing-email identities see a clear actor-facing message and cannot submit blindly.

Confirmed root README, DEVELOPMENT.md, and env docs remain accurate because this change does not introduce new operator configuration.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Made the GitHub login path explicit about email requirements and hardened the account-registration UX for identities that do not provide an email. The custom `/auth/login/github` route now requests Auth0 `openid profile email` plus GitHub `user:email`, which aligns the login initiation with the platform requirement that account registration depends on an authenticated email address.

On `/account/register`, missing-email identities now see a clear message explaining that account creation cannot continue without an email address, and the submit path uses the same message as a fallback instead of showing a generic failure. Added test coverage for the registration error-message mapping, the explicit GitHub login scopes, and the registration API rejection path when the session has no email.

Validation run:
- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`
- `bun run test:integration`

Risks/follow-ups:
- If an identity provider still cannot supply an email even with the requested scopes, the platform intentionally blocks registration rather than collecting email manually, which remains consistent with the current domain model.
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
