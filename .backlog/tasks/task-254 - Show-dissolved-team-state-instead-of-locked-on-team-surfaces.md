---
id: TASK-254
title: Show dissolved team state instead of locked on team surfaces
status: Done
assignee:
  - '@codex'
created_date: '2026-04-17 16:41'
updated_date: '2026-04-17 16:42'
labels: []
dependencies: []
documentation:
  - app/components/teams/ParticipantTeamDirectoryPanel.vue
  - app/components/teams/ParticipantTeamWorkspacePanel.vue
  - app/components/account/hackathons/AccountHackathonParticipantTeamPanel.vue
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The participant team directory and shared team workspace currently prefer a neutral `Locked` chip whenever the hackathon is past team-formation, which hides the more important dissolved team state. Update those team surfaces so dissolved teams show a red `Dissolved` chip instead of the generic locked badge, while leaving real submission-state badges elsewhere unchanged.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Dissolved teams show a `Dissolved` chip instead of the generic `Locked` chip in the participant team directory.
- [x] #2 Dissolved teams show a red `Dissolved` chip instead of the generic `Locked` chip in the shared team workspace header.
- [x] #3 Non-dissolved teams keep their existing locked/status badge behavior.
- [x] #4 Validation commands pass after the UI change.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the participant team directory badge ordering so dissolved teams take precedence over the generic locked indicator, and style the dissolved chip with the repo's error badge treatment.
2. Update the shared participant team workspace header so dissolved teams likewise show the red dissolved chip instead of the generic locked chip while preserving existing behavior for non-dissolved teams.
3. Run bun run lint, bun run typecheck, and bun run test:unit, then record the UI-test gap if no direct component automation exists for these badge states.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Confirmed canonical docs remain unchanged: dissolved-team visibility rules already live in the team API and team workspace documentation, so this change only adjusts badge priority and color on participant-facing team surfaces.

Updated the participant team directory so dissolved teams render a red `Dissolved` chip before the generic locked-state badge, preventing dissolved teams from being mislabeled as simply locked.

Updated the participant team workspace header to hide the generic locked badge when a team is dissolved and to render the dissolved chip with the shared error badge treatment instead.

This repo does not currently include direct component-level tests for these badge states, so validation relied on bun run lint, bun run typecheck, and bun run test:unit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Adjusted the participant team directory and shared team workspace so dissolved teams show a red `Dissolved` chip instead of the neutral `Locked` chip. Dissolved status now takes precedence over the generic post-team-formation locked badge, while non-dissolved teams keep their existing locked/status badge behavior.

No canonical docs changes were needed because the underlying dissolved-team visibility rules were already correct; this was a presentation fix only. Validation passed with `bun run lint`, `bun run typecheck`, and `bun run test:unit`.

Risk / follow-up: there is no direct component automation for these specific badge states yet, so future styling regressions here would still be caught mainly through manual UI review unless the repo later adds Vue component tests or BDD coverage for team-state chips.
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
