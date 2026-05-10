---
id: TASK-309
title: Enforce verified email during account registration
status: Done
assignee:
  - Codex
created_date: '2026-05-10 18:13'
updated_date: '2026-05-10 18:17'
labels:
  - open-source-readiness
  - p1
  - auth0
  - accounts
dependencies: []
references:
  - server/domains/accounts/index.ts
  - server/api/account/registration.post.ts
  - app/pages/account/register.vue
  - tests/integration/server/api/actor-platform-routes.test.ts
  - tests/unit/server/auth/actor.test.ts
documentation:
  - docs/domain-model.md
  - docs/api-surface.md
  - docs/security-analysis.md
modified_files:
  - server/domains/accounts/index.ts
  - tests/integration/server/api/actor-platform-routes.test.ts
  - docs/domain-model.md
  - docs/security-analysis.md
priority: medium
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Open-source readiness P1. Account registration currently requires an email address but does not enforce Auth0 `email_verified`. For platform identity, applications, Luma sync, communication, and prizes, enforce verified email server-side during account registration, or document and test an explicit mandatory Auth0 invariant if a code-level guard is not viable. Prefer server-side enforcement unless local code shows that Auth0 always guarantees verified emails for supported flows.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Account registration rejects authenticated identities whose `email_verified` claim is explicitly false or otherwise not verified for supported providers.
- [x] #2 The rejection uses a stable API error code/message and does not create a platform user, identity row, document acceptance, or audit entry.
- [x] #3 Verified identities continue to register successfully with exact current platform-document acceptance.
- [x] #4 Existing account-linking behavior remains intact for verified same-email social identities and unverified conflict cases.
- [x] #5 Automated tests cover verified registration success and unverified/missing verification rejection.
- [x] #6 Required validation passes before commit: `bun run lint`, `bun run typecheck`, and `bun run test:unit`; run targeted integration tests for registration behavior as well.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect account registration, actor identity claim mapping, and existing registration/linking tests to identify the earliest no-mutation guard point.
2. Enforce a server-side requirement that authenticated identities must have `email_verified === true` before platform account registration creates users, linked identities, platform-document acceptances, or audit records.
3. Return a stable registration API error code/message for unverified or missing verification claims, and add user-facing handling only if the current page would not surface the API message correctly.
4. Add targeted tests covering verified registration success, explicit `email_verified: false`, and missing verification rejection with no user/identity/acceptance/audit mutations; confirm existing account-linking tests still pass.
5. Update canonical docs only if they do not already state the resulting server-side invariant.
6. Run targeted registration tests plus `bun run lint`, `bun run typecheck`, and `bun run test:unit`; then mark acceptance criteria/DoD complete, commit only TASK-309 files, and push to `origin/main`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Started TASK-309. Initial worktree has untracked Backlog files for TASK-308, TASK-309, and TASK-310; only TASK-309 will be staged for this task.

Implemented the registration guard in `assertPlatformAccountRegistrationAllowed` before document validation, account-link challenge issuance, or registration writes. Verified identities continue through the existing platform-document acceptance behavior. Validation passed: targeted registration integration suite, `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Summary:
- Added a server-side account-registration invariant requiring `actor.sessionUser.email_verified === true` after email presence is confirmed and before any user, identity, platform-document acceptance, audit, or account-link challenge write can occur.
- Added targeted integration coverage for verified registration success plus explicit false and missing verification rejection with no registration-side mutations.
- Updated canonical domain/security documentation to state the verified-email registration requirement.

Validation:
- `bun run test:integration -- tests/integration/server/api/actor-platform-routes.test.ts`
- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`

Risks/follow-ups:
- No remaining test gap for registration. Regular platform access still relies on existing Auth0 session and platform actor checks; this task intentionally scoped enforcement to account registration.
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
