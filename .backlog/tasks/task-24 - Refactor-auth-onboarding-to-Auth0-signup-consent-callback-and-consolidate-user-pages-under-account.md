---
id: TASK-24
title: >-
  Refactor auth onboarding to Auth0 signup consent callback and consolidate user
  pages under /account
status: Done
assignee: []
created_date: '2026-03-26 17:27'
updated_date: '2026-03-26 17:58'
labels:
  - auth
  - onboarding
  - routing
  - ui
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement simplified auth flow where Auth0 handles login/signup and mandatory signup consent; app auto-creates platform account after callback for first-time users with verifiable consent signal. Remove app-owned terms onboarding surface. Consolidate authenticated user pages under /account/*, moving hackathon participation content into account dashboard and replacing account index with settings route.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Authenticated header CTA uses Auth0 login entry; no app-owned /auth/access or /auth/signup page flow
- [ ] #2 First-time authenticated identities are auto-provisioned into platform users only when required consent signal from Auth0 session is present
- [ ] #3 Existing users are redirected to /account/dashboard after auth
- [ ] #4 New users are redirected to /account/settings to complete profile (profile_pending -> completed via PATCH /api/account)
- [ ] #5 User-facing routes are /account/dashboard and /account/settings; participation content appears in account dashboard
- [ ] #6 Old /hackathons page is removed or redirected to account dashboard and nav reflects new structure
- [ ] #7 Relevant tests are updated for new route expectations and auth-navigation behavior
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented route consolidation to /account/dashboard and /account/settings, with legacy redirects from /dashboard, /account, and /hackathons.

Moved participation-focused dashboard content under /account/dashboard and simplified shell navigation/user menu links.

Replaced app-owned /auth/access and /onboarding/account flows with redirects to /account/settings.

Added backend auto-provision attempt for first authenticated identity when Auth0 consent claims are present (https://codex-hackathons/consents/privacy_policy and /platform_terms).

Configured Auth0 test tenant prompt custom text for signup-id and signup-password to include localhost policy URLs in copy.

Created and bound post-login Action codex-signup-consent-claims that emits consent ID token claims and persists consent timestamps in app_metadata.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Refactored authenticated user experience to account-scoped routes (`/account/dashboard`, `/account/settings`) and removed the app-owned document-acceptance onboarding flow in favor of callback-driven provisioning behavior. Added server-side first-login auto-provisioning based on Auth0 consent claims, plus tenant-level post-login Action wiring to issue those claims. Updated navigation, redirects, key BDD route expectations, and canonical docs for onboarding semantics. Added `/terms-and-conditions` page and surfaced legal links in footer and Auth0 signup prompt copy.

Constraint discovered: mandatory custom signup checkboxes in New Universal Login require prompt partials, and Auth0 Management API returned `operation_not_supported` for partials because the test tenant has no custom domain configured. As a result, legal links were configured in signup prompt copy and consent claims are emitted through Action, but strict tenant-side mandatory checkbox enforcement could not be completed without enabling a custom domain.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Canonical docs were updated or confirmed unchanged
- [ ] #2 Code behavior matches canonical docs
- [ ] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [ ] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [ ] #7 Auth and permissions changes follow the documented platform model
- [ ] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
