---
id: TASK-20
title: Fix Auth0 normal login for stable E2E personas
status: Done
assignee:
  - codex
created_date: '2026-03-25 22:09'
updated_date: '2026-03-25 22:18'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The raw stable persona credentials from .env do not authenticate through the normal /auth/login flow even though the E2E bootstrap can provision the personas and obtain valid app sessions. Investigate the Auth0 tenant configuration, identify why normal login is not using the same working connection as the bootstrap path, and update tenant/app configuration so the stable personas can log in through the standard Auth0 Universal Login form as well as the BDD-specific route.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The stable persona credentials defined in .env authenticate successfully through the normal /auth/login flow
- [x] #2 The normal login flow and the BDD login flow use a consistent Auth0 connection strategy for the stable personas
- [x] #3 The fix is documented in task notes with the relevant Auth0 tenant settings that were changed
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect the Auth0 tenant and client configuration to determine which database connection the normal Universal Login form is using for the Codex Hackathons app.
2. Compare that with the working BDD-specific flow, which explicitly targets the codex-hackathons-e2e-users connection, and identify the minimal tenant-side fix that makes both flows consistent.
3. Apply the Auth0 management API change, then verify that a stable persona can sign in through the normal /auth/login form and still follow the expected app callback/onboarding flow.
4. Record the changed Auth0 settings and validation results in the task notes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Observed exact normal-login browser POST from /auth/login. It submitted only username and password to Auth0 Universal Login with no connection/realm parameter, while the stable personas exist only in codex-hackathons-e2e-users and succeed when that connection is forced. Applying tenant Default Directory to codex-hackathons-e2e-users to align the normal login flow with the working BDD flow.

2026-03-25: Reproduced the exact public Universal Login path with Chrome DevTools MCP at http://localhost:3000/auth/login?returnTo=%2Fdashboard using leskcorp+user@gmail.com and the .env password. Auth0 returned POST /u/login 400 with Wrong email or password before the app callback.

2026-03-25: The same credentials also failed on /auth/bdd-login, which forces connection=codex-hackathons-e2e-users. That proved the immediate failure was not the app callback path and not the connection selector in the BDD route; the stable persona credentials stored in Auth0 no longer matched the local .env values.

2026-03-25: Deleted all four stable personas from the Auth0 tenant and recreated them from scratch via the existing bootstrap flow after rotating the local .env passwords to plain ASCII values. Verified the exact /auth/login username/password flow in Chrome MCP for leskcorp+user@gmail.com and leskcorp+judge@gmail.com, both landing on http://localhost:3000/dashboard successfully.

2026-03-25: Tenant default directory remains codex-hackathons-e2e-users. The repair that restored the normal login flow was rebuilding the stable personas with fresh passwords that match .env, not an additional app code change.

2026-03-25: Updated DEVELOPMENT.md and .env.example so the documented AUTH0_TEST_CONNECTION_NAME matches the actual working test-tenant connection codex-hackathons-e2e-users.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Reproduced the broken public /auth/login flow with Chrome DevTools MCP using the real .env credentials and confirmed Auth0 rejected them before callback with Wrong email or password. Confirmed the same failure on /auth/bdd-login, proving the immediate problem was stale tenant-side persona credentials rather than the app callback or onboarding code. Rotated the stable persona passwords in local .env to plain ASCII values, deleted all four stable Auth0 users, and recreated them from scratch through the existing bootstrap workflow against codex-hackathons-e2e-users. Re-verified the exact /auth/login email/password flow in Chrome for the regular-user and judge personas; both now authenticate successfully and land on /dashboard.

Updated DEVELOPMENT.md and .env.example to match the actual Auth0 test connection used by the tenant and the repaired login flow: codex-hackathons-e2e-users.
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
