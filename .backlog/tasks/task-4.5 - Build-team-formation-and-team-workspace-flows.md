---
id: TASK-4.5
title: Build team formation and team workspace flows
status: Done
assignee:
  - Codex
created_date: '2026-03-22 22:09'
updated_date: '2026-03-23 18:47'
labels:
  - frontend
  - ui
  - participant
  - teams
milestone: m-1
dependencies:
  - TASK-3
  - TASK-4.4
documentation:
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
parent_task_id: TASK-4
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the team formation and membership-management experience so approved users can create teams, discover open teams, request to join, manage join requests, and maintain valid team membership through the allowed lifecycle states.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Approved users can create teams, browse eligible teams, and request to join open teams during the allowed team-formation states.
- [x] #2 Team admins can manage join openness, review join requests, and manage membership while respecting canonical admin-presence and member-count constraints.
- [x] #3 Team members can view their own team workspace and the UI reflects when team actions are no longer allowed because of lifecycle or capacity constraints.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add hackathon-scoped participant team routes for browse/create and team workspace, keeping `app/pages/hackathons/[slug].vue` as the participant entry and CTA surface.
2. Create a bounded team-formation composable/helper layer to resolve actor plus visible hackathon id, load teams and team detail and join requests through existing APIs, and derive action availability and reasons from lifecycle, approval, capacity, and membership state.
3. Build reusable participant team components for the team list/create form, team workspace summary, join-request management, and membership actions using the existing Nuxt UI card and form patterns.
4. Wire only the existing canonical endpoints: list/create teams, get/update team, patch join policy, create/list/approve/reject/cancel join requests, leave team, and remove member.
5. Add authenticated BDD coverage for create/browse/join, team-admin join-request review, and a blocked membership/admin-presence path, plus focused helper unit tests for derived availability logic.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Supervisor opened TASK-4.5 after TASK-4.4 cleared. Dedicated worker will read canonical docs and backlog workflow, run focused discovery, and return a brief plus implementation plan for approval before coding.

Supervisor opened TASK-4.5 after TASK-4.4 cleared. Dedicated worker will read canonical docs and backlog workflow, run focused discovery, and return a brief plus implementation plan for approval before coding.

Supervisor approved the TASK-4.5 implementation plan. Implementation may proceed within the team-formation slice, including hackathon-scoped participant team routes, bounded helper/composable logic, and isolated authenticated BDD coverage tied to existing APIs.

Implemented hackathon-scoped participant team routes at `app/pages/hackathons/[slug]/teams/index.vue` and `app/pages/hackathons/[slug]/teams/[teamId].vue`, and moved the public detail entry surface to `app/pages/hackathons/[slug]/index.vue` so the nested team routes resolve correctly while preserving the public `/hackathons/:slug` URL.

Added the bounded participant team workspace layer in `app/composables/useTeamFormationWorkspace.ts` and `app/utils/team-workspace.ts`, including actor and visible-hackathon resolution, paginated team loading, team detail and join-request loading, derived availability helpers, and in-session pending join-request tracking against the existing canonical APIs only.

Built participant team UI components for directory and create flow, team workspace summary, membership management, and join-request review in `app/components/teams/`, and wired the approved-application CTA from the public detail surface into the team workspace.

Added isolated TASK-4.5 coverage with dedicated fixture hackathons in `tests/bdd/support/platform-fixtures.ts`, authenticated browser coverage in `tests/bdd/features/authenticated/team-workspace.feature` plus `tests/bdd/steps/team-workspace.steps.ts`, and helper unit coverage in `tests/unit/app/utils/team-workspace.test.ts`.

Validation completed: `bunx eslint` on touched app and test files, `bunx nuxi typecheck`, `bunx vitest run tests/unit/app/utils/team-workspace.test.ts tests/unit/support/bdd/platform-fixtures.test.ts`, `node --experimental-strip-types tests/bdd/bootstrap.ts`, and `bunx playwright test --project chromium-authenticated-bdd --grep "Participant team formation workspace"`.

Known caveat: the current API surface still does not expose a cross-session endpoint for listing a participant's own pending team join requests, so the cancel action is intentionally limited to join requests remembered in the current browser session instead of introducing non-canonical client persistence.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented the participant team-formation and team workspace slice with hackathon-scoped routes, bounded team workspace composable/helpers, reusable team UI panels, and authenticated/browser plus unit coverage. Validation passed across eslint, typecheck, focused vitest, BDD bootstrap, and direct browser verification of create, join, approve, and membership-guard flows. Known limitation: pending join-request cancellation remains session-local until the canonical API exposes a caller-scoped pending-request listing endpoint.
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
