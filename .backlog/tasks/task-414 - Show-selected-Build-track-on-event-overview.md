---
id: TASK-414
title: Show selected Build track on event overview
status: Done
assignee:
  - '@codex'
created_date: '2026-06-18 18:42'
updated_date: '2026-06-18 18:51'
labels:
  - frontend
dependencies: []
modified_files:
  - 'app/pages/account/events/[slug]/index.vue'
  - app/domains/events/participation.ts
  - tests/unit/app/domains/events/participation.test.ts
priority: medium
ordinal: 93000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Participants in Build events with track selection can see their selected track at the top of the event overview and use a clear action to change it from the event details tab.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Approved participants on Build events with configured tracks see a prominent blue track card at the top of the overview tab.
- [x] #2 The card shows the participant's selected track using participant-facing track wording.
- [x] #3 The card includes a change-track action that links to the same event's Details tab.
- [x] #4 The card is not shown for events without tracks or participants without a selected track.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Locate the account event overview and Details-tab track selection patterns.
2. Add a participant-facing selected-track card above the overview content for approved Build participants with selected tracks.
3. Link the change action to the same event Details tab and verify with unit, lint, typecheck, and BDD checks.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Docs unchanged: existing canonical docs already cover Build track selection and account Details track changes.
Validation passed: bun run lint; bun run typecheck; bun run test:unit (109 files, 749 tests); bun run test:bdd (47 public/authenticated scenarios and 2 destructive scenarios).
Added unit coverage for the Build overview selected-track notice eligibility helper.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a blue selected-track notice at the top of the account event overview for approved Build participants. The notice shows the selected track and links Change track to the same event Details tab, reusing the existing track-selection flow. Verified with lint, typecheck, unit tests, and BDD.
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
