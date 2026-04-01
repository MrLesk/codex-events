---
id: TASK-142
title: Add GitHub Auth0 login autofill for GitHub profile
status: Done
assignee:
  - codex
created_date: '2026-04-01 06:06'
updated_date: '2026-04-01 06:15'
labels: []
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/api-surface.md
  - docs/testing-strategy.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement GitHub social login support through the existing Auth0 Nuxt session model so users who sign in with GitHub have their platform profile automatically populated with their GitHub profile URL. Preserve the canonical account-link flow for existing password-backed accounts and keep manual profile editing authoritative once a value has been saved.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Users can initiate GitHub login through the website using the existing Auth0-backed session architecture without replacing the default login flow.
- [x] #2 Platform account registration automatically stores the GitHub profile URL when the authenticated identity comes from GitHub or includes a linked GitHub identity.
- [x] #3 Automatic GitHub profile population does not overwrite an existing saved githubProfileUrl chosen by the user.
- [x] #4 Existing same-email account linking behavior for verified social identities continues to work for GitHub login.
- [x] #5 Automated unit and integration coverage verify the GitHub login entry path and profile autofill behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a dedicated `/auth/login/github` server route that calls `useAuth0(event).startInteractiveLogin()` with Auth0 authorization parameters targeting the GitHub connection and preserving the existing safe `returnTo` handling.
2. Extend request-actor/session serialization with derived GitHub identity metadata gathered server-side from the active subject and any linked Auth0 identities so downstream account flows can use it without trusting client-only claims.
3. Update platform-account registration to prefill `githubProfileUrl` from GitHub identity metadata while leaving existing saved profile values unchanged, and preserve the current verified social account-link behavior.
4. Add focused unit and integration tests for the GitHub login route, GitHub identity detection, registration autofill, and linked-account behavior.
5. Update operator/developer docs for Auth0 GitHub connection setup if runtime configuration or tenant bootstrap expectations changed.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added a dedicated `/auth/login/github` route that uses the existing Auth0 Nuxt session flow with a configurable GitHub connection name and safe `returnTo` handling.

Derived `sessionUser.githubProfileUrl` server-side for GitHub-backed Auth0 sessions and reused that value during platform account registration plus account and hackathon profile form prefills when no stored GitHub URL exists.

Validation completed: `bun run lint`, `bun run typecheck`, `bun run test:unit`, `bun run test:integration`, plus targeted route and actor tests while iterating.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented GitHub social-login autofill without changing the platform domain model. The app now exposes a dedicated `/auth/login/github` entry route, adds a GitHub sign-in button in the shell header, and derives a GitHub profile URL from GitHub-backed Auth0 sessions. Platform account registration now stores that derived URL automatically for new GitHub-backed accounts, and the account-settings and hackathon-registration profile forms fall back to the session-derived GitHub URL when the stored field is still empty so existing users can persist it through the existing profile save path.

The change preserves the current Auth0/Nuxt session model and the existing same-email social account-link flow. Stored `platformUser.githubProfileUrl` continues to win over the session-derived fallback, so an existing saved URL is not overwritten by automatic population. Operator and contributor docs were updated to document the new `NUXT_AUTH0_GITHUB_CONNECTION_NAME` setting and the manual Auth0 GitHub social-connection setup requirement.

Validation run and passing locally: `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bun run test:integration`. Added focused tests for the GitHub login route, GitHub session actor derivation, auth-navigation helpers, and GitHub-backed account registration. Remaining operational caveat: the checked-in Auth0 bootstrap automation still does not provision the GitHub social connection, so deployments must configure that connection in Auth0 separately and keep its name aligned with the runtime setting.
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
