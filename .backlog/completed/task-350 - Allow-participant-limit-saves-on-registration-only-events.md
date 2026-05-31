---
id: TASK-350
title: Allow participant limit saves on registration-only events
status: Done
assignee: []
created_date: '2026-05-31 19:11'
updated_date: '2026-05-31 19:14'
labels:
  - bug
dependencies: []
modified_files:
  - app/components/account/events/AccountEventAdminSettingsPanel.vue
  - app/domains/events/admin-event.ts
  - tests/unit/app/domains/events/admin-event-schema.test.ts
  - tests/unit/server/domains/events/index.test.ts
priority: medium
ordinal: 53000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fix the settings-save path so changing a registration-only event's participant limit does not trip the competition-configuration guard, and pin the server behavior with regression coverage.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Saving a participant limit for a non-hackathon event is accepted without a competition-configuration error.
- [x] #2 Competition-only configuration fields remain rejected for non-hackathon event updates.
- [x] #3 Validation passes for the changed code.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Moved account event configuration PATCH construction into a tested event-admin helper. Non-hackathon configuration saves now omit the server's competition-only fields while still sending participant limit and common registration requirements. Added client payload and server regression coverage; lint, typecheck, and unit tests pass.
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
