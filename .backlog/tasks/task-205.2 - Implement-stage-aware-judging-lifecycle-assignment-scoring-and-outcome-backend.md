---
id: TASK-205.2
title: >-
  Implement stage-aware judging lifecycle, assignment, scoring, and outcome
  backend
status: Done
assignee: []
created_date: '2026-04-12 22:08'
updated_date: '2026-04-13 08:56'
labels:
  - judging
  - backend
dependencies:
  - TASK-205.1
references:
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
parent_task_id: TASK-205
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refactor judging and outcome runtime logic to support multiple blind reviews per submission, optional pitch review, manual finalist selection, weighted final scoring, and the new final_deliberation stage.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Blind-review assignment creation supports the configured blind review count with distinct judges per submission and 0..10 normalized criterion scoring.
- [x] #2 Pitch-review setup freezes the active judge panel, creates one pitch assignment per finalist submission per frozen judge, and averages only submitted pitch votes.
- [x] #3 Lifecycle guards and action routes support blind_review, shortlist, pitch_review, and final_deliberation with the canonical admin permissions and transition rules.
- [x] #4 Leaderboard, shortlist, winners, and final-score calculations use the configured blind/pitch weights and distinguish blind-only, blind-plus-pitch, and pitch-only hackathons correctly.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
The backend now supports configurable blind coverage, optional pitch review, stage-aware judge assignments, weighted final scoring, manual finalist selection, and final-deliberation-based winner publication.

Blind-only, pitch-only, and combined judging paths all use the canonical lifecycle and scoring model reflected in the updated runtime routes, persistence layer, and targeted automated coverage.
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
