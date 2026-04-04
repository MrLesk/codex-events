---
id: TASK-184
title: Show full teams as member-limit reached in participant team pages
status: Done
assignee:
  - '@codex'
created_date: '2026-04-04 11:48'
updated_date: '2026-04-04 11:51'
labels: []
dependencies: []
documentation:
  - >-
    /Users/alex/projects/codex-hackathons/app/components/teams/ParticipantTeamWorkspacePanel.vue
  - >-
    /Users/alex/projects/codex-hackathons/app/components/account/hackathons/AccountHackathonParticipantTeamPanel.vue
  - /Users/alex/projects/codex-hackathons/app/utils/team-workspace.ts
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Participant-facing team detail views should treat full teams as closed for new collaborators. When a viewed team has reached the hackathon member limit, the team header should show `Member limit reached` instead of `Open to join requests`, and the membership actions section should not render for non-members browsing that team.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Participant team detail views show `Member limit reached` when a team is full and the viewer is not already a member.
- [x] #2 The participant membership actions section is hidden when a full external team is being viewed.
- [x] #3 Existing own-team and non-full team behavior remains unchanged.
- [x] #4 Local validation passes with bun run lint bun run typecheck and bun run test:unit.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Participant team detail views now treat full external teams as closed for new collaborators. The shared workspace badge shows `Member limit reached` in the warning palette instead of `Open to join requests`, and the membership actions section is hidden for non-members when the displayed team is already at capacity. Added a reusable member-limit helper in the team workspace utilities and unit coverage for the limit check. Canonical docs were confirmed unchanged because this is a participant UI refinement within the existing team-capacity rules. Validation passed with `bun run lint`, `bun run typecheck`, and `bun run test:unit`. Remaining risk is limited to untested end-to-end participant rendering for this exact visual state because the full Auth0-backed BDD suite was not run in this pass.
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
