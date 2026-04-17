---
id: TASK-237
title: Polish participant Teams tab selected-team UX
status: Done
assignee:
  - Codex
created_date: '2026-04-17 12:11'
updated_date: '2026-04-17 12:49'
labels:
  - participant
  - teams
  - ux
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refine the participant-facing Teams tab in the account hackathon detail page. When a user opens another team from the Teams tab, the selected-team view should behave like a focused detail surface instead of a split detail-plus-directory layout. Preserve the existing participant team model and use the current account/workspace navigation patterns. Also restore the team-link copy action in the shared-team view and improve directory actions for the viewer's own team and join-disabled states.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 When a participant opens another team from the Teams tab, the page shows the selected team as a focused detail view with a back-to-teams control and without the teams directory rendered underneath.
- [x] #2 Copy team link works from the selected-team detail card and copies the shareable account Teams-tab URL for that team.
- [x] #3 The teams directory shows a dedicated action for the viewer's own team that routes to the Workspace tab.
- [x] #4 When a selected shared team is open to join requests and has capacity, the detail view shows the join action; if the viewer already has a team, the join action remains visible in a disabled state with a clear explanation of why it cannot be used.
- [x] #5 Relevant participant Teams-tab automated coverage is updated for the new navigation and action states.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the participant Teams tab selected-team state in app/components/account/hackathons/AccountHackathonParticipantTeamPanel.vue so a shared-team selection renders as a focused detail view with a back-to-teams control, hides the directory while selected, and wires the copy-team-link handler.
2. Extend app/components/teams/ParticipantTeamDirectoryPanel.vue to expose a dedicated own-team action that routes to the Workspace tab while preserving the existing create-team CTA behavior for users without a team.
3. Adjust app/components/teams/ParticipantTeamWorkspacePanel.vue so open shared teams with capacity always render the join action area, including a disabled state with a clear explanation when the viewer already belongs to another team.
4. Update participant team BDD coverage for selected-team navigation, copy-link behavior assumptions where practical, own-team CTA rendering, and disabled join action messaging.
5. Run bun run lint, bun run typecheck, and bun run test:unit; report any unrelated blockers encountered during validation.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented the Teams-tab polish entirely in the participant team surfaces without changing canonical product docs. Shared-team mode now renders as a focused detail view with a back-to-teams link, the copy-link handler is wired in the selected-team panel, and the directory renders a dedicated Workspace-tab CTA for the viewer's own team.

Adjusted shared-team membership actions so open teams with capacity still surface the join CTA in selected-team mode, but the CTA now lives in the team-card header instead of a separate membership box. When the viewer is already on another team, the Request to join button stays visible with a high-contrast disabled treatment, a not-allowed cursor, a title tooltip, and a warning toast on click that explains the blocker. Added a targeted BDD fixture reset so the operations-fixture shared-team scenario uses a joinable team for this state.

Validation run: bun run lint passed, bun run typecheck passed, bun run test:unit passed (79 files, 495 tests). Participant Teams-tab BDD feature/step coverage was updated but the Playwright BDD suite was not run in this pass.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Polished the participant Teams tab selected-team experience in the account hackathon page. Shared-team selection now becomes a focused detail surface with a Back to teams link, and the teams directory is hidden until the user returns to the list. The selected-team copy action was repaired by wiring the missing copy-team-link handler to the shareable Teams-tab URL builder.

Updated action affordances around team navigation and joining. The teams directory now renders a dedicated Your team action that routes back to the Workspace tab for the viewer's own team. In selected-team mode, the join action moved into the team-card header, uses a higher-contrast emerald treatment across light and dark themes, keeps a not-allowed cursor when unavailable, and still shows the join blocker through the button tooltip plus a warning toast when clicked while unavailable.

Updated participant Teams-tab BDD coverage and test fixtures for the new navigation/action states, including back-to-list behavior, own-team routing, and disabled join CTA expectations. Validation run in this pass: bun run lint, bun run typecheck, and bun run test:unit all passed locally. I did not run the Playwright BDD suite, so only the feature/step coverage was updated here.
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
