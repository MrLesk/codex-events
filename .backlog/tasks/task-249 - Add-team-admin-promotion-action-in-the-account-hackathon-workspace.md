---
id: TASK-249
title: Add team-admin promotion action in the account hackathon workspace
status: Done
assignee:
  - codex
created_date: '2026-04-17 16:24'
updated_date: '2026-04-17 16:29'
labels:
  - workspace
  - team-formation
  - ui
  - api
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/permissions-matrix.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
In `/account/hackathons/:slug`, the Workspace tab already lets team admins remove other members from their team. Add a sibling action that promotes an active non-admin teammate to team admin. Both the new promotion action and the existing removal action must require explicit user confirmation before the mutation runs. Keep the behavior aligned with existing team-membership invariants, success/error toast patterns, and canonical documentation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The Workspace tab shows a `Make admin` action for active non-admin teammates when the current user can manage the team.
- [x] #2 Confirming the new action promotes the selected teammate to team admin, refreshes the workspace state, and shows success feedback.
- [x] #3 The existing `Remove member` action requires explicit confirmation before the member-removal mutation runs.
- [x] #4 Server-side membership handling rejects invalid promotion requests and audits successful team-admin promotions.
- [x] #5 Relevant automated tests cover the new promotion flow and any updated membership helpers, and canonical docs stay aligned with the implemented team-admin capability.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a team-member promotion API action under the existing team-members action routes, reusing team-admin authorization and active-membership lookup, and audit successful promotions.
2. Extend the team-formation composable with a promote-member mutation that refreshes current-team, own-team, and visible-team state in the same way as member removal.
3. Update the participant workspace member list UI to show a `Make admin` button for active non-admin teammates, stacked above `Remove member`, and add confirmation prompts in the workspace panel before both mutations run.
4. Update canonical docs for team-admin member-management capabilities and add unit/integration coverage for the new promotion flow and related helper behavior.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Discovery found no existing promote-to-admin action. Existing destructive confirmations in this area use `window.confirm(...)`, and workspace success feedback is handled in `AccountHackathonParticipantWorkspacePanel.vue`.

Implemented a new team-member action route at `/api/hackathons/:hackathonId/teams/:teamId/members/:userId/actions/make-admin` with guards for self-promotion and already-admin targets plus `team_member.promoted_to_admin` audit logging.

Workspace member actions now use confirmation prompts before both promotion and removal, and the shared participant team workspace renders a `Make admin` button above `Remove member` for non-admin teammates only.

Validation passed with `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bun run test:integration -- tests/integration/server/api/team-formation-routes.test.ts`. Direct `bun test <file>` was not suitable here because the raw runner did not resolve the repo's package aliases.

Worktree contains unrelated existing changes in `app/components/account/hackathons/AccountHackathonCreditsPanel.vue` and several untracked `tmp/local-d1-*.sqlite` files; this task did not modify them.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a participant-workspace team-admin promotion flow alongside the existing member-removal flow. Team admins can now promote another active non-admin teammate from the Workspace tab, and both promotion and removal require explicit confirmation before the mutation runs.

On the backend, this adds `POST /api/hackathons/:hackathonId/teams/:teamId/members/:userId/actions/make-admin` with team-admin authorization, self/duplicate guards, and audit logging. On the frontend, the workspace composable now exposes the promotion mutation, the shared team workspace panel renders the new `Make admin` action above `Remove member`, and the workspace container owns the confirmation prompts and success toasts.

Canonical docs were updated to reflect the new team-admin capability in the domain model, permissions matrix, and API surface. Validation passed with `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bun run test:integration -- tests/integration/server/api/team-formation-routes.test.ts`. No follow-up work was identified inside this task.
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
