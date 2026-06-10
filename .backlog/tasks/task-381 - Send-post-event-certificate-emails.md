---
id: TASK-381
title: Send post-event certificate emails
status: To Do
assignee: []
created_date: '2026-06-10 07:30'
updated_date: '2026-06-10 07:30'
labels:
  - api
  - email
  - events
dependencies: []
milestone: m-2
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When an event completes, checked-in participants receive a thank-you email with a direct link to their participation certificate, reusing the existing outbound email queue infrastructure and ideally combined with the event feedback invitation so participants get one post-event touchpoint.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Completed events enqueue one certificate email per effectively checked-in participant with their certificate link.
- [ ] #2 Email delivery reuses the existing queue and retry infrastructure.
- [ ] #3 Participants who hid their certificate still receive their own link.
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
