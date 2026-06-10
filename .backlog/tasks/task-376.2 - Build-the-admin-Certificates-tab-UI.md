---
id: TASK-376.2
title: Build the admin Certificates tab UI
status: To Do
assignee: []
created_date: '2026-06-10 07:30'
updated_date: '2026-06-10 07:30'
labels:
  - ui
  - admin
  - events
dependencies: []
milestone: m-2
priority: high
parent_task_id: TASK-376
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a Certificates tab to the account event workspace for event admins listing approved participants with their effective attendance and its source (Luma or manual). Admins search by name or email, filter by checked-in or not checked-in, mark participants joined or not joined with toggle semantics, and open the public certificate of joined participants. Rows update in place without losing scroll position.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Certificates tab appears for event admins in the account event workspace for every event type.
- [ ] #2 Search plus all / checked-in / not-checked-in filters work over approved participants.
- [ ] #3 Joined and not-joined controls reflect the override state, toggle-clear back to the Luma default, and show the attendance source.
- [ ] #4 Joined participants expose a link to their public certificate.
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
