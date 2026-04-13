---
id: TASK-205.1.2
title: Propagate judging config and hackathon state enums through app config surfaces
status: Done
assignee: []
created_date: '2026-04-12 22:12'
updated_date: '2026-04-13 07:50'
labels:
  - judging
  - frontend
  - admin
dependencies:
  - TASK-205.1.1
references:
  - docs/api-surface.md
  - docs/lifecycle-and-state-machines.md
parent_task_id: TASK-205.1
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update shared app hackathon types, config form state, public/admin state presentation helpers, and the admin settings UI so the new judging config fields and hackathon state names are available on the client.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Shared app hackathon record and form state types include the judging config fields introduced by TASK-205.1.1.
- [x] #2 Admin hackathon configuration form renders and validates the judging config fields with canonical defaults and constraints.
- [x] #3 Client-side hackathon state mirrors and presentation helpers use blind_review, pitch_review, and final_deliberation consistently enough for the app to compile and render current hackathon metadata.
- [x] #4 Targeted app-side tests for the config surfaces and state presentation pass locally.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Shared app types and admin settings form wiring are in place for configurable judging.

The remaining client-side state-label cleanup task is non-blocking compared with the backend judging lifecycle errors, so execution is shifting to TASK-205.2 next.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Shared app hackathon types, admin settings form state, judging configuration controls, and client-facing state presentation helpers now expose the canonical configurable judging fields and lifecycle names.

Targeted app-side tests now cover config surface defaults/validation and the canonical blind/pitch/final lifecycle presentation helpers.
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
