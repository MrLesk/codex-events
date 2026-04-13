---
id: TASK-205.1.2.3
title: >-
  Update client hackathon state mirrors and presentation helpers for canonical
  judging states
status: Done
assignee: []
created_date: '2026-04-13 06:06'
updated_date: '2026-04-13 07:50'
labels:
  - judging
  - frontend
dependencies:
  - TASK-205.1.2.1
references:
  - docs/lifecycle-and-state-machines.md
parent_task_id: TASK-205.1.2
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace judge_review in shared client-side state unions and presentation helpers with blind_review, pitch_review, and final_deliberation so the app can compile against the canonical lifecycle.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Shared client-side hackathon state unions and badges use blind_review, pitch_review, and final_deliberation consistently.
- [x] #2 Public/admin hackathon state labels and summaries reflect the canonical lifecycle names.
- [x] #3 Targeted tests for client state presentation and helper logic pass locally.
- [x] #4 This task does not implement the judging workflow behavior itself; it only updates shared state mirrors and presentation helpers.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Supervisor context brief (L1): closest analogs are `app/composables/useHackathonPresentation.ts` for public labels/summaries and `app/utils/admin-workspace.ts` for shared client state order/color/phase helpers. Main risk is overreaching into admin workflow behavior that belongs to later tasks; keep this task limited to state mirrors, labels, summaries, and affected tests/prop unions.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Client-side hackathon state mirrors now use `blind_review`, `pitch_review`, and `final_deliberation` across shared public/admin presentation helpers, prop unions, and the affected unit tests.

Public/admin state labels, summaries, colors, and ordering now reflect the canonical lifecycle names, and targeted app-side state/helper tests pass locally.
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
