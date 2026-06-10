---
id: TASK-376
title: Add admin Certificates tab with manual check-in overrides
status: To Do
assignee: []
created_date: '2026-06-10 07:30'
updated_date: '2026-06-10 07:30'
labels:
  - api
  - ui
  - admin
  - events
dependencies: []
milestone: m-2
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Event admins manage who actually participated from a Certificates tab in the account event workspace. Luma check-in stays the default attendance signal, and admins can override it per approved participant by marking them joined or not joined. The override wins over Luma in both directions and is the gate for certificate availability, which also makes certificates reachable for events that do not use Luma at all. The tab lists approved participants with their attendance state and source, supports search and a checked-in / not checked-in filter like the Participants tab, and links to the public certificate of each joined participant.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 Approved applications carry an admin check-in override (joined or not joined) with the acting admin and time, and effective attendance is the override when present, otherwise the Luma check-in.
- [ ] #2 Event admins and platform admins can set or toggle the override through the API; pressing the active state again clears it back to the Luma default, and the action is audit logged.
- [ ] #3 Certificate availability (page, JSON, image, PDF, workspace entry) follows effective attendance.
- [ ] #4 The account event workspace shows a Certificates tab to event admins with search, an attendance filter, per-participant joined / not joined controls, attendance source, and certificate links.
- [ ] #5 Canonical docs and automated coverage reflect the override model.
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
