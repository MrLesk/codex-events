---
id: TASK-21
title: 'Redesign authenticated dashboard, account, and user hackathons surfaces'
status: In Progress
assignee:
  - codex
created_date: '2026-03-25 22:36'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the current over-explanatory authenticated user surfaces with more useful, Figma-informed experiences. The dashboard should act as a practical hub instead of exposing raw actor metadata or duplicating sidebar navigation. The account page should focus on editable profile data and account lifecycle actions without dead or confusing states. The authenticated hackathons surface should stop reusing the public discovery page and instead show the current and past hackathons the signed-in user is participating in with a minimal interface. Also resolve the misleading 'PROFILE SETUP REQUIRED' presentation seen after completed onboarding.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Dashboard no longer shows raw actor metadata such as actor kind or Auth0 subject and removes duplicated navigation-style calls to action that are already present in the sidebar
- [ ] #2 Account page presents a cleaner profile-management surface aligned with the design reference and offers an obvious path when onboarding/profile completion is required
- [ ] #3 Authenticated users have a dedicated hackathons participation view showing their current and past participation states instead of linking back to the public discovery list
- [ ] #4 Completed onboarding sessions no longer present PROFILE SETUP REQUIRED or otherwise misleading profile-completion messaging on the dashboard
- [ ] #5 The updated UI direction is checked against the Figma design reference and validated locally in the running app
<!-- AC:END -->

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
