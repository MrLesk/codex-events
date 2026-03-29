---
id: TASK-96
title: Rename admin Applications tab to Participants and add participant filter bar
status: Done
assignee: []
created_date: '2026-03-29 17:34'
updated_date: '2026-03-29 17:40'
labels:
  - ui
  - admin
  - hackathons
dependencies: []
references:
  - >-
    /Users/alex/projects/codex-hackathons/app/components/account/hackathons/AccountHackathonAdminOperationsPanel.vue
  - >-
    /Users/alex/projects/codex-hackathons/app/components/admin/AdminApplicationsReviewPanel.vue
  - /Users/alex/projects/codex-hackathons/app/pages/index.vue
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the account hackathon admin workspace so the current Applications tab is presented as Participants and better reflects participant-management workflows. Rework the Participants section so the summary metrics sit above the review surface, add a homepage-style filter bar for participant states, and improve the participant review UX within the existing admin-only workspace.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The admin-only tab currently labeled Applications is renamed to Participants everywhere it appears in the account hackathon detail workspace.
- [x] #2 The Participants workspace shows the five participant summary cards above the review surface instead of inside the review card.
- [x] #3 A filter bar below the summary cards lets admins switch between Applications and Approved views and shows the current filtered total.
- [x] #4 The participant review surface responds to the selected filter with clear empty-state copy for each view.
- [x] #5 Relevant unit coverage is updated for the renamed tab and admin navigation behavior, and local validation passes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Canonical docs were confirmed unchanged for this UI-only admin workspace adjustment.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Renamed the admin hackathon detail tab from Applications to Participants using the canonical `participants` tab id and updated the shell-navigation tests to keep admin workspace highlighting correct. Moved the five participant summary cards into the Participants workspace shell, added a homepage-style Applications/Approved filter bar with live filtered totals, and simplified the review card so it focuses on the currently selected participant view. Added a filtered-group helper so Applications and Approved views reuse the inferred-team grouping logic without showing false pending teammate hints, and updated unit coverage for the new view behavior. Risks/follow-up: old `?tab=applications` links no longer resolve because the canonical tab id is now `participants`; no runtime compatibility shim was added by design.

Validation passed with `bun run test:unit` and `bun run typecheck`.
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
