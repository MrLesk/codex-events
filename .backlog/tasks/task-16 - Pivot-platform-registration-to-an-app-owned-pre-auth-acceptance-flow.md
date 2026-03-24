---
id: TASK-16
title: Pivot platform registration to an app-owned pre-auth acceptance flow
status: Done
assignee: []
created_date: '2026-03-24 20:44'
updated_date: '2026-03-24 20:52'
labels: []
dependencies: []
references:
  - /Users/alex/projects/codex-hackathons/app/pages/onboarding/account.vue
  - >-
    /Users/alex/projects/codex-hackathons/server/api/account/registration.post.ts
  - /Users/alex/projects/codex-hackathons/app/utils/auth-navigation.ts
documentation:
  - /Users/alex/projects/codex-hackathons/docs/api-surface.md
  - /Users/alex/projects/codex-hackathons/docs/domain-model.md
  - /Users/alex/projects/codex-hackathons/docs/testing-strategy.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Move initial platform registration entry from the post-Auth0 onboarding page to an app-owned public flow that captures platform privacy-policy and platform-terms acceptance before redirecting to Auth0. After successful authentication, the application should finalize platform account creation inside the app using the accepted current document versions and sensible identity-derived defaults, so a new user does not need to complete a second registration form after the Auth0 round-trip. Preserve the platform database as the source of truth for exact-version acceptance records and keep direct sign-in for existing users coherent.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A public app-owned registration entry page lets an unauthenticated user review the current privacy-policy and platform-terms documents, explicitly accept both, and continue to Auth0.
- [x] #2 After Auth0 callback, an authenticated identity without a platform account can complete platform account creation automatically from the saved registration intent and exact current document versions without a second registration form.
- [x] #3 The backend registration contract still records exact-version platform document acceptance in platform data and rejects outdated or mismatched document references.
- [x] #4 Protected participant and account-entry surfaces route authenticated identities without platform accounts into the new registration-completion path instead of the old post-auth onboarding form.
- [x] #5 Canonical docs and automated coverage are updated to reflect the pre-auth acceptance UX and post-auth finalization behavior.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented a public `/auth/access` entry flow that supports sign-in and platform registration, stores a short-lived client-side registration intent before redirecting to Auth0, and auto-finalizes platform account creation after callback using current platform document IDs plus Auth0-derived display-name defaults.

Rewired anonymous auth guards and authenticated-identity-without-account entry points to the new auth-access route while leaving `/onboarding/account` as a compatibility redirect.

Validation: `bun test tests/unit/app/utils/auth-navigation.test.ts tests/unit/app/utils/platform-registration-intent.test.ts`, `bun x tsc --noEmit`, and `bun run lint` passed. The existing integration route test harness still fails in this environment because `vi.stubGlobal` and `vi.unstubAllGlobals` are unavailable under the current Bun/Vitest runtime, so that gap is environmental rather than specific to this change.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented the platform-registration pivot to an app-owned auth entry flow. Added a new public `/auth/access` screen that exposes sign-in and registration paths, lets unauthenticated users review and accept the current privacy-policy and platform-terms documents before redirecting to Auth0, and persists a short-lived browser registration intent so the authenticated callback can finalize account creation without a second registration form. The final registration write still goes through the existing `/api/account/registration` contract, using Auth0 identity fields to derive the initial display name and preserving exact-version acceptance in platform data.

Rewired the rest of the app so protected anonymous navigation now lands on the auth entry route instead of jumping straight to `/auth/login`, and authenticated identities without platform accounts are sent into the same registration-completion path from the dashboard, account page, and participant team surfaces. Left `/onboarding/account` as a compatibility redirect to the new entry route so older links do not break. Added client-side helpers for safe return-to handling and registration-intent storage, updated BDD coverage for account deletion and recovery to use the new flow, added unit coverage for the new helpers, and updated canonical docs to describe the pre-auth acceptance plus post-auth finalization model.

Validation run: `bun test tests/unit/app/utils/auth-navigation.test.ts tests/unit/app/utils/platform-registration-intent.test.ts`, `bun x tsc --noEmit`, and `bun run lint` all passed. The existing integration API route harness failed in this environment because its global-stubbing helpers are unavailable under the current Bun/Vitest runtime; no change was made to that harness as part of this task.
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
