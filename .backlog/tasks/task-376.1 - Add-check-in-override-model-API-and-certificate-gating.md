---
id: TASK-376.1
title: Add check-in override model, API, and certificate gating
status: To Do
assignee: []
created_date: '2026-06-10 07:30'
updated_date: '2026-06-10 07:30'
labels:
  - api
  - db
  - admin
  - events
dependencies: []
milestone: m-2
priority: high
parent_task_id: TASK-376
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Store an admin check-in override on user applications (joined or not joined, with the acting admin and time), expose it through admin application reads, add the event-admin action that sets, switches, or toggle-clears the override with audit logging, and resolve certificate availability plus participant workspace state from effective attendance: the override when present, otherwise the Luma check-in. Restoring a withdrawn application clears the override together with the other check-in fields.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Schema and migration add override status, time, and acting admin to user applications.
- [ ] #2 Override action API enforces event admin or platform admin access, allows only approved applications, toggles the active state back to the Luma default, and writes audit entries.
- [ ] #3 Effective attendance drives public certificate eligibility and the own-participation workspace state.
- [ ] #4 Canonical docs and integration coverage describe the override model.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
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
