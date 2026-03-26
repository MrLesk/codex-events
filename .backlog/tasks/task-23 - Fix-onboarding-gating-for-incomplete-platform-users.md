---
id: TASK-23
title: Fix onboarding gating for incomplete platform users
status: Done
assignee:
  - Codex
created_date: '2026-03-26 07:31'
updated_date: '2026-03-26 07:36'
labels:
  - auth
  - onboarding
  - ui
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Reproduce the Google-auth onboarding path with the real browser session, verify dashboard/hackathon access is blocked until terms acceptance and profile completion, and correct any app-side or data-side issues causing incomplete users to reach the workspace.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A freshly authenticated user without a platform account is redirected to the terms-acceptance step before entering /dashboard.
- [x] #2 A platform user in onboarding_state profile_pending is redirected to the profile onboarding step before entering /dashboard or participant-only hackathon flows.
- [x] #3 A reset test run in the browser confirms the user cannot reach the dashboard or join/apply flows until onboarding completes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Root cause: server-side participant authorization only required a platform account, not completed onboarding. A profile_pending user could bypass the UI redirect and submit applications directly to /api/hackathons/:hackathonId/applications.

Fix: split 'has platform account' from 'workspace access' in server/auth/actor.ts. requirePlatformActor now enforces onboardingState=completed, while account PATCH/DELETE use requirePlatformAccountActor so onboarding can still finish or be reset.

Live validation: deleted the current Google-linked platform account, reproduced /dashboard -> /auth/access, completed step 1 only, confirmed /dashboard and /hackathons redirect to /onboarding/account, confirmed direct application POST and participation API both return 403 platform_onboarding_incomplete, and removed the stray application row created during repro from the active local D1 file.

Residual risk: other routes that intentionally use public visibility remain accessible, which is fine; the completed-onboarding enforcement now applies to workspace and participant APIs.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Enforced completed onboarding for workspace and participant API access. Fresh Google-auth users now get terms first, then profile completion, and profile_pending accounts cannot reach /dashboard, load participation workspace data, or submit hackathon applications via direct API calls. Account PATCH/DELETE remain available during onboarding. Regression tests cover profile_pending rejection for applications and participation. Live browser repro was run against the real Google session, and the stray application row created before the fix was deleted from the active local D1 state.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [x] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
