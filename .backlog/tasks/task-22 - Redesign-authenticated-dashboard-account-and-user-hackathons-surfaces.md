---
id: TASK-22
title: Redesign authenticated dashboard account and user hackathons surfaces
status: Done
assignee:
  - codex
created_date: '2026-03-25 22:37'
updated_date: '2026-03-26 01:24'
labels:
  - ui
  - auth
  - participant
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the current dashboard/account/authenticated-hackathons experience with user-focused surfaces that align with the Figma design language and canonical platform behavior. The dashboard should stop exposing raw actor metadata or duplicating sidebar navigation, the account page should behave like a clear settings page, and authenticated users should get a dedicated hackathons participation surface instead of being routed back to the public discovery homepage. Also fix the stale profile-setup UI state so completed onboarding no longer shows dead 'profile setup required' messaging.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Dashboard presents useful role-aware content without raw actor/auth identifiers or duplicated sidebar actions.
- [x] #2 Account page is a focused settings page with clear editable profile sections and no dead onboarding state messaging.
- [x] #3 Authenticated users get a dedicated hackathons participation page for current and past involvement instead of the public homepage.
- [x] #4 Completing onboarding refreshes session-derived shell state so completed users no longer see stale 'profile setup required' UI.
- [x] #5 Updated surfaces are visually aligned with the Figma reference patterns while preserving canonical product behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Refactor authenticated shell navigation so the sidebar owns navigation, the authenticated Hackathons item points to a dedicated participation route, and shared session-derived UI state can be refreshed after onboarding/account mutations.
2. Redesign the dashboard into a useful role-aware overview that removes raw actor/Auth0 metadata and duplicated navigation cards, while preserving access to participant, judge, admin, and prize workflows.
3. Redesign the account page into a focused settings surface with grouped editable profile sections and danger-zone actions only.
4. Add an authenticated user hackathons participation page that shows current and past involvement using existing application/team/submission data, while leaving the public discovery homepage at / unchanged.
5. Validate the redesigned surfaces in the local app and run targeted checks/tests for the affected behavior.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented authenticated participant hackathons surface in this branch: added `/api/hackathons/participation`, `useHackathonParticipationWorkspace`, `app/pages/hackathons/index.vue`, and `HackathonParticipationCard` with current/past sections powered by application/team/submission data.

Added integration coverage in `tests/integration/server/api/hackathon-routes.test.ts` for endpoint auth requirement and current/past participation segmentation.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Redesigned the authenticated participant-facing surfaces around the real participation workspace instead of generic navigation cards. Dashboard now surfaces current participation and role-specific work, account settings no longer expose raw Auth0/internal metadata, and the authenticated /hackathons page is the dedicated current-and-past participation workspace. Fixed stale onboarding-shell state by aligning shared session actor invalidation with the new cache key so completed onboarding no longer leaves the dashboard showing profile setup required. Added and validated the participation API path and kept the workspace typecheck and hackathon integration test green.
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
- [ ] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
