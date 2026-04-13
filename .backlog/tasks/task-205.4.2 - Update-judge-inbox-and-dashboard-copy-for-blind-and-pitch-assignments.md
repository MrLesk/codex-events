---
id: TASK-205.4.2
title: Update judge inbox and dashboard copy for blind and pitch assignments
status: Done
assignee: []
created_date: '2026-04-13 08:52'
updated_date: '2026-04-13 09:28'
labels:
  - judging
  - frontend
  - judge
dependencies: []
references:
  - docs/permissions-matrix.md
  - docs/api-surface.md
parent_task_id: TASK-205.4
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make judge dashboard and inbox surfaces use stage-appropriate labels and summaries for blind and pitch assignments without leaking blind identity.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Judge inbox cards distinguish blind and pitch assignments with stage-appropriate copy
- [x] #2 Blind inbox surfaces remain anonymized while pitch inbox surfaces reveal project and team identity
- [x] #3 Targeted judge-workspace tests cover stage-specific inbox behavior
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Supervisor context brief (L1): inbox and dashboard copy currently assume every assignment is blind and derive labels directly from `blindSubmission`. Reuse the new stage-aware helpers from `app/utils/judging-workspace.ts` and keep blind cards anonymized while making pitch cards explicitly open and finalist-facing.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Judge dashboard and inbox copy now distinguish blind and pitch assignments through shared stage-aware helpers, keeping blind cards anonymous while exposing project/team identity only for pitch assignments.

Targeted judge-workspace tests now cover stage-specific inbox labels, blind anonymity, pitch identity exposure, and dashboard queue messaging; lint and typecheck passed during implementation.
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
