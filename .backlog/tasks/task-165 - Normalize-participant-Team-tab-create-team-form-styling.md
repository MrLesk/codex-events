---
id: TASK-165
title: Normalize participant Team tab create-team form styling
status: Done
assignee:
  - codex
created_date: '2026-04-02 21:17'
updated_date: '2026-04-02 21:18'
labels:
  - ui
  - account-workspace
  - team-workspace
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Align the participant Team tab on the account hackathon page with the established workspace UI conventions. The create-team card currently uses different internal spacing and its form controls look inconsistent with the rest of the account hackathon experience. Update the participant-facing Team tab so the create-team area feels native to the surrounding workspace without changing the underlying team-creation behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The create-team section in the participant Team tab matches the surrounding account hackathon workspace card spacing and visual rhythm.
- [x] #2 The create-team form fields and join-policy control follow the same account-facing input styling conventions used elsewhere in the product.
- [x] #3 The create-team primary action follows the existing workspace button styling conventions while preserving the current team-creation flow and test selectors.
- [x] #4 Local validation for this change is recorded with lint typecheck and unit-test results, or any limitation is documented in the task notes.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the participant team directory component so the create-team card uses the same inset-card spacing and panel rhythm as the existing participant team workspace and submission panels.
2. Replace the create-team form controls with the same account-facing rounded elevated field styling used elsewhere in the account workspace while preserving validation messages, checkbox behavior, and the existing test selector.
3. Validate the change with bun run lint, bun run typecheck, and bun run test:unit, then record results and any gaps in the task notes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Adjusted the participant Team tab create-team form in app/components/teams/ParticipantTeamDirectoryPanel.vue to use the same inset-card layout and rounded elevated form controls as the participant workspace and submission panels.

Preserved the existing create-team validation flow and kept the participant-team-create-submit selector unchanged so current BDD coverage remains valid.

Confirmed canonical docs remain unchanged for this styling-only update.

Validation passed locally: bun run lint, bun run typecheck, bun run test:unit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aligned the participant Team tab create-team section with the surrounding account hackathon workspace UI. The create-team card now uses the same inset-card spacing pattern as the participant workspace panels, and the team name, team slug, and join-policy controls now use the rounded elevated field treatment already used across account-facing forms. The primary create action remains the same workflow entry point and keeps the existing participant-team-create-submit test hook intact.

Canonical docs were confirmed unchanged because this update only affects presentation. Local validation passed with bun run lint, bun run typecheck, and bun run test:unit. Risk is low because the change is isolated to one participant-facing component and preserves existing behavior and selectors.
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
