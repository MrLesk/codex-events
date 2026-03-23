---
id: TASK-4.10
title: 'Build admin judging, shortlist, and winner-management flows'
status: Done
assignee:
  - Codex
created_date: '2026-03-22 22:09'
updated_date: '2026-03-23 19:29'
labels:
  - frontend
  - ui
  - admin
  - judging
  - winners
milestone: m-1
dependencies:
  - TASK-3
  - TASK-4.7
  - TASK-4.8
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
Create the admin workflows that run the competition after submissions close, including assignment oversight, allowed judge-intervention actions, shortlist review, manual final ranking reorder, winner announcement, and hackathon completion.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Admins can monitor judge assignment progress and perform only the documented intervention actions for the current assignment state.
- [x] #2 The UI exposes computed leaderboard and shortlist views, including manual shortlist reordering without changing underlying judge scores.
- [x] #3 The UI supports winner announcement and completed-hackathon outcomes only in the canonical lifecycle states.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a dedicated admin competition route at `app/pages/admin/hackathons/[hackathonId]/competition.vue` and extend the admin workspace tabs so setup, operations, and competition remain separate bounded surfaces.
2. Extend the admin workspace client layer in `app/utils/admin-workspace.ts` and `app/composables/useAdminWorkspace.ts` with the missing shortlist, winner, and admin judging-intervention types/helpers needed by the competition surface, while keeping lifecycle guards and display rules aligned with the canonical docs.
3. Build focused admin competition UI components under `app/components/admin/` for three bounded areas: judging oversight with admin `reassign` and `force-skip`, shortlist review with manual reorder, and winner/completion controls.
4. Wire the competition route only to existing canonical endpoints: judging assignment list plus `reassign` and `force-skip`, leaderboard read, shortlist read and reorder, winners read, announce winners, and complete hackathon. Do not expand into a separate completed-assignment ineligibility-revert UI unless a concrete blocker appears.
5. Add targeted validation in existing repo style: unit coverage for new admin workspace helpers and authenticated browser coverage for the admin competition route, including admin access, shortlist reorder, winner announcement, completion, and an admin judging intervention path from the route UI.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Supervisor opening TASK-4.10 as an unblocked Milestone 1 slice. Dedicated worker will read canonical docs and backlog workflow, run context-hunter, and return a discovery brief plus implementation plan for approval before any code changes.

Supervisor approved the TASK-4.10 implementation direction. Scope includes assignment reassign and force-skip, but excludes a separate completed-assignment ineligibility-revert UI unless implementation reveals a concrete blocker. Worker may now implement within that scope, update tests/docs as needed, and keep the write set bounded to the admin competition slice.

Plan approved by supervisor. Implementation will stay bounded to the admin competition slice and include assignment reassign plus force-skip, without expanding into a separate completed-assignment ineligibility-revert UI unless a concrete blocker appears.

Implemented the dedicated admin competition route at `app/pages/admin/hackathons/[hackathonId]/competition.vue` with bounded panels for judging oversight, shortlist review, and winner/completion controls. The route stays within the canonical admin workspace tabs, uses only the documented competition endpoints, and refreshes the competition surface after each mutation.

Added isolated authenticated BDD fixture support for competition-specific reassign, force-skip, shortlist, and completion scenarios so destructive browser coverage can run safely under the repo's parallel Playwright configuration. Also fixed the shortlist draft reorder typecheck issue and added focused lifecycle helper coverage for the `winners_announced -> complete` branch used by the competition route.

Validation passed for this implementation chunk:
- `bunx eslint 'app/pages/admin/hackathons/[hackathonId]/competition.vue' app/components/admin/AdminCompetitionAssignmentsPanel.vue app/components/admin/AdminCompetitionOutcomePanel.vue app/components/admin/AdminCompetitionShortlistPanel.vue app/components/admin/AdminHackathonWorkspaceTabs.vue app/utils/admin-workspace.ts tests/unit/app/utils/admin-workspace.test.ts tests/bdd/steps/admin-competition.steps.ts tests/bdd/support/platform-fixtures.ts`
- `bunx vitest run tests/unit/app/utils/admin-workspace.test.ts`
- `bun run typecheck`
- `node --experimental-strip-types tests/bdd/bootstrap.ts`
- `./node_modules/.bin/bddgen`
- `bunx playwright test tests/bdd/features/authenticated/admin-competition.feature --project chromium-authenticated-bdd`

Docs remain unchanged because the implemented behaviors already match the current canonical competition lifecycle, permissions, and admin workspace rules in `docs/`.

Follow-up risk recorded outside this task implementation: the repository's current GitHub Actions `backend-release-gate` fails in the Bun/Linux unit-test step because Bun 1.3.11 on Ubuntu cannot load `node:sqlite` for four existing database/fixture suites. Local validation for this task passes, and the CI failure is not caused by the admin competition route changes themselves.
<!-- SECTION:NOTES:END -->

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
