---
id: TASK-182
title: Refine shared-team participant Team tab navigation
status: Done
assignee:
  - codex
created_date: '2026-04-04 11:19'
updated_date: '2026-04-04 11:36'
labels: []
dependencies: []
documentation:
  - >-
    /Users/alex/projects/codex-hackathons/app/components/account/hackathons/AccountHackathonParticipantTeamPanel.vue
  - >-
    /Users/alex/projects/codex-hackathons/app/pages/account/hackathons/[slug]/index.vue
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When a participant opens another team's shared Team tab view, the page should focus on that viewed team and provide a native-looking way back to the participant's own team without showing the normal own-team directory below.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 When a participant is viewing another team's Team tab page, the participant team directory is not shown below the viewed team card.
- [x] #2 The shared-team view shows a `Back to my team` link directly above the viewed team card using the same visual style as the page-header back link.
- [x] #3 The participant's normal team directory remains available when they are on their own Team tab page.
- [x] #4 Relevant automated coverage is updated for the shared-team Team tab behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Keep the shared-team detection in the participant Team tab panel and move the `Back to my team` control into the shared-team content block directly above the viewed team card.
2. Render the control as a `NuxtLink` using the same classes and icon treatment as the page-header back link so the UI matches the established pattern.
3. Gate the participant team directory so it is hidden while `isViewingSharedTeam` is true and remains available on the participant's own Team tab flow.
4. Update automated coverage for the shared-team Team tab behavior, then run bun run lint, bun run typecheck, and bun run test:unit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Discovery completed against the participant Team tab and the page header back-link pattern. The existing shared-team state already lives in AccountHackathonParticipantTeamPanel via `isViewingSharedTeam`, so the directory and back-link behavior should be adjusted there rather than inside the directory component.

User approved the shared-team navigation plan and asked to proceed.

Adjusted the shared-team branch in the participant Team tab so the `Back to my team` control now renders inside the shared-team content area directly above the viewed team card, using the same link styling and icon treatment as the page-header back link.

Changed the participant team directory gate to follow the normal own-team flow and stay hidden while `isViewingSharedTeam` is true, which removes the `Other teams` section from shared-team pages while keeping it available on the participant's own Team tab.

Updated Team tab BDD coverage with one own-team scenario that still shows visible teams and one shared-team scenario that verifies the back link and the hidden directory.

Validation results: `bun run lint` passed, `bun run typecheck` passed, and `bun run test:unit` passed.

BDD coverage was updated but not executed locally in this pass because the full Auth0-backed browser suite was not run.

User reported the first implementation did not change the UI for `leskcorp+testuser4@gmail.com`. Live inspection showed that account has no own team in `codex-vienna-2026-04-18`, so the original `isViewingSharedTeam` check was too narrow because it required `ownTeam` to exist. The shared-team state should instead follow the selected team query whenever the loaded current team differs from the participant's own landing Team tab state, including participants with no team membership.

Follow-up fix: shared-team detection now keys off the selected `team` query plus the resolved current team slug instead of requiring an `ownTeam` record. That preserves normal own-team behavior when `team=<own-team>` is present while correctly treating `team=<other-team>` as a shared-team view for participants who do not belong to any team yet.

Manual browser verification on localhost confirmed both branches: `leskcorp@gmail.com` visiting `?tab=team&team=the-good-gang` still sees the normal own-team page without the back link, and `leskcorp+testuser4@gmail.com` visiting the same URL now sees `Back to my team` above the card with the `Other teams` section hidden.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Refined the participant Team tab shared-team view so it now focuses on the selected external team without showing the normal `Other teams` directory below. The `Back to my team` control was moved into the shared-team content block directly above the team card and restyled to match the existing page-header back link pattern.

The normal own-team flow still exposes the team directory, and automated coverage was updated to distinguish those two states. Local validation passed for `bun run lint`, `bun run typecheck`, and `bun run test:unit`. The Auth0-backed BDD files were updated but that suite was not executed locally in this pass.

A follow-up fix tightened the shared-team detection so `team=<own-team>` still renders as the normal own-team page, while `team=<other-team>` now hides the directory and shows the `Back to my team` link even for participants who have not joined a team yet. Manual localhost verification covered both the own-team and no-own-team cases after the code change.
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
