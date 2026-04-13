---
id: TASK-205.3
title: 'Implement admin workflow for shortlist, pitch review, and final deliberation'
status: Done
assignee: []
created_date: '2026-04-12 22:08'
updated_date: '2026-04-13 08:05'
labels:
  - judging
  - frontend
  - admin
dependencies:
  - TASK-205.2
references:
  - docs/lifecycle-and-state-machines.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
parent_task_id: TASK-205
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the admin workspace so lifecycle controls, leaderboard views, finalist selection, pitch review operations, and final ranking all reflect the configurable judging model.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Admin lifecycle controls and state presentation expose blind_review, shortlist, pitch_review, and final_deliberation only when they are applicable to the hackathon configuration.
- [x] #2 The shortlist workspace becomes manual finalist selection for pitch-enabled blind-review hackathons instead of final ranking reordering.
- [x] #3 Final-deliberation UI lets admins review combined scores and persist final ordering without changing underlying judge scores.
- [x] #4 Pitch-only and blind-only hackathons render sensible admin workflow copy and controls without dead states or contradictory messaging.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Supervisor context brief (L2): lifecycle action logic is centralized in `app/utils/admin-workspace.ts`, competition-route data loading and section gating are in `AccountHackathonCompetitionPanel.vue`, and shortlist/outcome copy is concentrated in `AdminCompetitionShortlistPanel.vue` and `AdminCompetitionOutcomePanel.vue`. Main risks are partial dead-state handling for blind-only and pitch-only hackathons, and mismatching the new shortlist/final-deliberation API shapes.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Admin lifecycle controls, operations copy, and competition-route section gating now distinguish blind-only, pitch-only, and combined judging paths using `blind_review`, `shortlist`, `pitch_review`, and `final_deliberation` only when they apply.

The shortlist workspace now manages blind finalist selection, pitch review has explicit admin transition messaging, and final deliberation exposes weighted score breakdowns plus manual final-order persistence without mutating judge scores.
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
