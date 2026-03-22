---
id: TASK-3.7
title: Implement submission and judging APIs
status: To Do
assignee: []
created_date: '2026-03-22 18:55'
updated_date: '2026-03-22 19:00'
labels:
  - backend
  - api
  - judging
milestone: m-0
dependencies:
  - TASK-3.1
  - TASK-3.2
  - TASK-3.3
  - TASK-3.4
  - TASK-3.5
  - TASK-3.6
documentation:
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/permissions-matrix.md
  - docs/schema-outline.md
parent_task_id: TASK-3
priority: high
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the backend APIs that cover team submissions and the judging workflow. This work must enforce submission-state rules, the transition into judging preparation, blind judging visibility, review progress, ineligibility handling, reassignment rules, disqualification behavior, and the documented no-submission operational read model described in the canonical docs.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Team admins can manage submissions only in the documented lifecycle states, including submit and withdraw behaviors before judging preparation begins, and the backend exposes the documented no-submission team section data needed for operational views.
- [ ] #2 Judging preparation and active review follow the documented blind-review, assignment, scoring, ineligibility, skip, reassignment, and disqualification rules.
- [ ] #3 Automated tests for this API area include unit and integration coverage plus Auth0-backed end-to-end scenarios for submission locking, visibility restrictions, review-state guards, reassignment behavior, no-submission derived reads, and audit-relevant actions.
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
