---
id: TASK-21
title: 'Redesign authenticated dashboard, account, and user hackathons surfaces'
status: Done
assignee:
  - '@codex'
created_date: '2026-03-25 22:36'
updated_date: '2026-04-12 14:08'
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
- [x] #1 Dashboard no longer shows raw actor metadata such as actor kind or Auth0 subject and removes duplicated navigation-style calls to action that are already present in the sidebar
- [x] #2 Account page presents a cleaner profile-management surface aligned with the design reference and offers an obvious path when onboarding/profile completion is required
- [x] #3 Authenticated users have a dedicated hackathons participation view showing their current and past participation states instead of linking back to the public discovery list
- [x] #4 Completed onboarding sessions no longer present PROFILE SETUP REQUIRED or otherwise misleading profile-completion messaging on the dashboard
- [x] #5 The updated UI direction is checked against the Figma design reference and validated locally in the running app
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Deliver the authenticated-surface redesign through the completed child tasks covering admin navigation, judge roster assignment, roster search, participant overview navigation, dedicated submission management, simplified submission state, and split Team/Submission workspace shells.
2. Keep the parent task as the roll-up record for the redesign set and confirm canonical docs remain unchanged because the work is a UI and workflow refinement rather than a product-model change.
3. Rely on the validation run captured in each completed child task and summarize any remaining risks at the parent level.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Simplified the participant account hackathons surface by removing explanatory section copy and replacing the card summary/stat-box layout with compact state chips plus a single primary action.

Updated hackathon participation summaries to expose the actual hackathon start date for account cards and switched Current vs Upcoming grouping to use that same date so the section placement matches the displayed metadata line.

Validation: bun run test:unit passed (51 files, 238 tests) and bun run typecheck passed. Canonical docs unchanged for this UI-only refinement.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed the authenticated-surface redesign tracked by this parent through child tasks TASK-21.1 through TASK-21.7. The delivered scope covers the admin hackathon detail navigation and role-assignment tabs, judge roster assignment UX, role roster candidate search, participant hackathon overview and team workspace navigation, a dedicated participant Submission tab, a simplified submission panel, and separate Team and Submission workspace wrappers.

The outcome is a cleaner authenticated experience across dashboard, account, and hackathon participation surfaces: duplicated or misleading navigation patterns were removed, participant workflows were separated into clearer dedicated surfaces, and the onboarding/profile-completion presentation no longer leaves completed users in a misleading setup state.

Canonical docs remain unchanged because this was a UI and interaction refinement. Validation was executed as part of the completed child tasks. Risk/follow-up: if future authenticated-surface redesign work is needed, open a new task instead of extending this completed roll-up.
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
