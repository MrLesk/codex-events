---
id: TASK-205.2.4
title: >-
  Refactor shortlist, final deliberation, and winners backend for configurable
  judging
status: Done
assignee: []
created_date: '2026-04-13 06:13'
updated_date: '2026-04-13 08:56'
labels:
  - judging
  - backend
dependencies:
  - TASK-205.2.3
references:
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/api-surface.md
parent_task_id: TASK-205.2
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update shortlist, leaderboard, final-deliberation, and winners backend behavior so outcome calculations and admin ranking flows match the configurable blind and pitch judging model.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Shortlist becomes manual finalist selection for pitch-enabled blind-review hackathons rather than final ranking reorder.
- [x] #2 Final score calculation uses the configured blind/pitch weights and supports blind-only, pitch-only, and combined hackathons.
- [x] #3 Final-deliberation backend replaces shortlist as the final ranking review stage before winners are announced.
- [x] #4 Targeted backend tests cover shortlist selection, final score calculation, and winners data for the supported judging configurations.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Split into sequential child tasks for shortlist finalist selection, final-deliberation weighted scoring, and winners/final ranking flow to keep worker ownership bounded.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Shortlist now persists manual pitch finalists, final deliberation exposes weighted blind/pitch scoring plus ranking override, and winner announcement/public winners now derive from final-deliberation ordering.

The outcome backend cleanly supports blind-only, pitch-only, and combined judging flows without reusing the old shortlist-as-final-order model.
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
