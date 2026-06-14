---
id: TASK-405
title: Restore admin staff track selector
status: Done
assignee:
  - '@codex'
created_date: '2026-06-14 18:23'
updated_date: '2026-06-14 18:25'
labels: []
dependencies: []
modified_files:
  - app/components/account/events/AccountEventPublishedRosterPanel.vue
ordinal: 84000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Event admins need to keep assigning published staff to whole-event visibility or a specific track after the staff roster was regrouped by row.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Admins see a track scope dropdown for assigned staff members when the event has tracks
- [x] #2 Changing the dropdown updates staffTrackId through the existing role assignment PATCH flow
- [x] #3 Participant-facing staff grouping remains by General Event Staff and populated track rows
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Restore the computed track ordering and admin-only staffTrackId update helper in the published roster panel.\n2. Add a compact admin-only dropdown back to grouped staff cards without reintroducing participant-facing track labels.\n3. Run lint, typecheck, and unit tests; finalize the task and commit the scoped files.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Restored the admin-only staff track dropdown in grouped staff cards. The dropdown uses the existing PATCH role-assignment flow and is only shown when the viewer can manage the roster and tracks exist. Validation passed: bun run lint, bun run typecheck, bun run test:unit. Authenticated browser inspection was not repeated because the local account route redirects through Auth0 in this session.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Restored the admin-only staff track selector inside grouped staff cards. The control uses the existing role assignment PATCH flow for staffTrackId and remains hidden from non-admin participant-facing views, preserving the grouped staff rows. Verified with lint, typecheck, and unit tests; no dedicated Vue component test was added because this repository does not currently have a component mount test harness.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [x] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [x] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
