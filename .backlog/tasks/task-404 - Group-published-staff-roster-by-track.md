---
id: TASK-404
title: Group published staff roster by track
status: Done
assignee:
  - '@codex'
created_date: '2026-06-14 17:59'
updated_date: '2026-06-14 18:05'
labels: []
dependencies: []
modified_files:
  - app/components/account/events/AccountEventPublishedRosterPanel.vue
  - app/domains/events/published-roster.ts
  - tests/unit/app/domains/events/published-roster.test.ts
ordinal: 83000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The staff tab should present published staff in participant-facing groups: general event staff first, followed by one row for each track that has staff members. Individual staff cards should not repeat track labels or track controls.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Staff roster displays a General Event Staff group for whole-event staff when present
- [x] #2 Track-specific staff display in separate track rows only for tracks with members
- [x] #3 Individual staff cards no longer show track labels, selected-track badges, or per-card track selectors
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a published-roster helper that groups staff into General Event Staff first, then track rows with members.
2. Render staff rosters as horizontal grouped rows while keeping judges on the existing grid.
3. Remove staff track labels, selected-track card badges, and per-card track selectors from individual staff cards.
4. Cover grouping/count helpers with unit tests and run lint, typecheck, and unit tests.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented grouped staff roster sections in the published roster panel. Extracted grouping/count helpers into app/domains/events/published-roster.ts and covered them in tests/unit/app/domains/events/published-roster.test.ts. Validation passed: bun run lint, bun run typecheck, bun run test:unit. Local dev server started successfully at http://localhost:3000/, but the account event route redirected to Auth0, so authenticated visual inspection of the staff tab was not possible from this session.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Published staff now render in participant-facing rows: whole-event staff first, then only tracks with assigned staff. Individual staff cards no longer include track labels, selected-track badges, or per-card track selectors; the selected-track signal moved to the row header. Verified with lint, typecheck, and unit tests; browser visual inspection was blocked by Auth0 redirect on the account route.
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
