---
id: TASK-240
title: Remove the separate competition surface from the account hackathon workspace
status: Done
assignee:
  - '@codex'
created_date: '2026-04-17 13:29'
updated_date: '2026-04-17 13:34'
labels:
  - judging
  - admin
  - frontend
  - ux
dependencies: []
documentation:
  - 'app/pages/account/hackathons/[slug]/index.vue'
  - app/components/account/hackathons/AccountHackathonAdminOperationsPanel.vue
  - app/components/account/hackathons/AccountHackathonCompetitionPanel.vue
  - app/utils/account-hackathon-seo.ts
  - docs/testing-strategy.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Move the remaining pitch, pitch review, final deliberation, winners, and prize redemption surfaces into the primary Operations workflow on the account hackathon page, then remove the separate account competition panel and scrub remaining account-workspace references to a competition surface.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The account hackathon Operations tab renders shortlist, pitch, pitch review, final deliberation, winners, and prize redemptions without mounting a separate `AccountHackathonCompetitionPanel`.
- [x] #2 `AccountHackathonCompetitionPanel.vue` is removed from the account hackathon page composition and deleted if no longer needed.
- [x] #3 User-facing account-workspace copy and SEO no longer refer to a separate competition surface or competition tab.
- [x] #4 Relevant tests and docs are updated, and required validation passes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
L2 context brief: the `Operations` tab already owned lifecycle state and admin-only controls, while `AccountHackathonCompetitionPanel.vue` was only a secondary surface mounted underneath it. The safest native refactor was to inline the remaining assignment, pitch, pitch-review, final-deliberation, winner, and redemption sections into `AccountHackathonAdminOperationsPanel.vue`, reuse the existing admin child panels, and delete the wrapper panel from page composition.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Moved the remaining later-stage admin judging and outcome surfaces into `AccountHackathonAdminOperationsPanel.vue`, so the account hackathon Operations tab now owns shortlist, assignment interventions, pitch progression, pitch review, final deliberation, winners, and prize redemptions in one place.

Removed `AccountHackathonCompetitionPanel.vue` from the account hackathon page composition and deleted the file. Updated account-workspace SEO and admin copy to stop referring to a separate competition surface.

Validation passed with `bun run lint`, `bun run typecheck`, and `bun run test:unit`. Risk/follow-up: internal helper component filenames and BDD test ids still use the historical `AdminCompetition*` naming family even though the account workspace no longer exposes a separate competition surface.
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
