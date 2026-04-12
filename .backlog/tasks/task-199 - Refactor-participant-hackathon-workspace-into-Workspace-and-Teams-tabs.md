---
id: TASK-199
title: Refactor participant hackathon workspace into Workspace and Teams tabs
status: Done
assignee:
  - codex
created_date: '2026-04-12 15:57'
updated_date: '2026-04-12 16:21'
labels: []
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
  - docs/permissions-matrix.md
  - docs/lifecycle-and-state-machines.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the participant-facing Team and Submission tabs with a Workspace tab for the participant's own team/submission state and a Teams tab for the hackathon-wide team directory. Support explicit no-team, solo-team, and regular-team workspace states; keep solo as a one-member team with special UI; and allow creating a regular team directly from solo by replacing the solo team in one action. Update canonical docs to match the new behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Participant-facing account hackathon navigation exposes Workspace and Teams instead of separate Team and Submission tabs.
- [x] #2 Workspace shows no-team, solo-team, and regular-team states with submission rendered below the team section.
- [x] #3 No-team state shows Participate as solo and Create team actions and does not auto-open a provisional solo workspace.
- [x] #4 Solo participation persists as a one-member team with a stable UI discriminator, renders a compact solo workspace, keeps Leave team available, and always shows Create team.
- [x] #5 Creating a regular team from solo replaces the solo team in one server-side action and leaves the participant as admin of the new team.
- [x] #6 Teams tab is visible to workspace users at all hackathon stages, lists all active teams, and supports team-directory filtering including solo and multi-person teams.
- [x] #7 Join actions appear in Teams only during team formation for teams that are open to join requests and have capacity; non-joinable teams remain visible.
- [x] #8 Canonical docs and automated tests are updated to reflect the new participant workspace and team-directory behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update canonical docs to replace the provisional solo-team workspace rule with a Workspace/Teams participant model and explicit no-team, solo-team, and regular-team states.
2. Add a small persisted team UI discriminator so the app can distinguish a solo workspace from a one-person regular team after reloads and migrations.
3. Add server support for creating solo teams explicitly and for replacing a solo team with a newly created regular team in one action while preserving existing team-membership invariants.
4. Refactor participant account hackathon navigation from Team + Submission to Workspace + Teams, rendering submission below the team section in Workspace.
5. Rebuild the participant workspace UI around no-team, solo-team, and regular-team states, removing the provisional default solo workspace and keeping Create team visible in solo mode.
6. Rebuild the participant team directory as a dedicated Teams tab that lists all active teams, adds solo/multi-person/open/full filters, and only exposes join actions during team formation for eligible teams.
7. Update automated tests for the new navigation, solo/team transitions, and team-directory behavior, then run bun run lint, bun run typecheck, and bun run test:unit.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Replaced the participant Team and Submission tabs with Workspace and Teams, added a persisted `teams.workspace_mode` discriminator plus a migration, removed the provisional default solo workspace, and introduced explicit no-team, solo-team, and regular-team participant flows. `POST /api/hackathons/:hackathonId/teams` now supports explicit solo creation and solo-to-team replacement through `replaceOwnSoloTeam`, join approvals convert solo workspaces into regular teams, and the Teams tab now acts as a full active-team directory with solo, multi-person, open, and full filters while keeping join actions gated by team-formation rules. Updated canonical docs and unit coverage, and verified the final tree with `bun run lint`, `bun run typecheck`, and `bun run test:unit`.

Follow-up: the existing BDD feature narratives still describe the older Team/Submission tab model and should be rewritten when we want browser-spec coverage to match the new Workspace/Teams behavior exactly.
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
