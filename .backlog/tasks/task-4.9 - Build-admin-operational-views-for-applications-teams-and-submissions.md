---
id: TASK-4.9
title: 'Build admin operational views for applications, teams, and submissions'
status: Done
assignee:
  - Codex
created_date: '2026-03-22 22:09'
updated_date: '2026-03-23 07:13'
labels:
  - frontend
  - ui
  - admin
  - operations
milestone: m-1
dependencies:
  - TASK-3
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
Create the admin operational surfaces for reviewing applications, monitoring teams and submissions, and handling operational interventions during an active hackathon. Admins need this view to run the program according to the documented permissions and lifecycle rules.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Admins can review and act on applications from the UI using the canonical state transitions.
- [x] #2 Admins can inspect teams, submission status, and the computed no-submission section without relying on participant or judge views.
- [x] #3 The operational UI clearly separates admin interventions such as admin-withdrawal and disqualification from participant-driven actions.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a dedicated admin-operations route for a single hackathon, keeping `app/pages/admin/hackathons/[hackathonId].vue` focused on setup/lifecycle work from TASK-4.8 and exposing a clear path into operations.
2. Extend the admin workspace client layer in `app/utils/admin-workspace.ts` and `app/composables/useAdminWorkspace.ts` with typed application data and the minimum derived helpers needed for application review, team/submission monitoring, and no-submission grouping from existing APIs.
3. Build dedicated admin-operational UI components under `app/components/admin/` for three bounded surfaces: application review actions, team/submission status monitoring, and admin-only interventions that clearly separate admin-withdrawal from disqualification.
4. Wire the operational route to existing canonical endpoints first: application list/approve/reject, team and submission reads, computed no-submission reads, and submission admin-withdraw/disqualify actions. Reuse the existing admin error/toast patterns instead of reopening participant or judge views.
5. Add focused tests around the new admin-operational slice, matching existing repo patterns: unit coverage for new admin helpers, route/component coverage for the operational workspace, and scenario coverage for the canonical admin actions and no-submission presentation.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Supervisor opening TASK-4.9 now that TASK-4.8 is clean. Expected write scope should stay inside admin operational files and avoid modifying the public discovery slice still under active rework in TASK-4.2.

No implementation approved yet. Worker must read canonical docs/backlog workflow, run context-hunter, then present a concrete plan for approval before editing code.

Supervisor is assigning a dedicated worker now that TASK-4.8 is clean. No coding is approved until the worker reads docs/workflow, runs context-hunter, and presents a concrete implementation plan for approval.

Supervisor requested explicit plan handoff. No implementation is approved until the worker sends a concise discovery brief plus backlog-backed plan for approval.

Implemented a dedicated admin operations route at `app/pages/admin/hackathons/[hackathonId]/operations.vue` and kept the existing setup workspace limited to a lightweight navigation link into the new surface.

Extended the admin workspace client layer with typed application records plus derived helpers for submission status badges, intervention eligibility, and no-submission grouping; the operations route reuses existing admin APIs for application review, team detail reads, per-team submission reads, computed no-submission reads, admin-withdrawal, and disqualification.

Added focused unit coverage for the new admin-operational helper logic in `tests/unit/app/utils/admin-workspace.test.ts`.

Validation run: `bunx vitest run tests/unit/app/utils/admin-workspace.test.ts`, `bun run test:unit`, and `bun run typecheck` passed. `bun run lint` still fails in unrelated dirty-worktree file `app/utils/judging-workspace.ts` with an existing `@stylistic/arrow-parens` error outside TASK-4.9 scope.

Independent review reopened TASK-4.9. Remaining issues before the task is clean: (1) the operations route currently collapses several admin data-load failures into false empty states instead of surfacing an error, (2) team operations are still first-page-only via `page=1&page_size=100` with no pagination/load-more path, and (3) the new route/panel wiring still lacks route/component/browser-level coverage for the operational flows and permission gating.

Task reopened from review with three concrete findings: surface admin data-load failures instead of false empty states, handle paginated team result sets in the operations route, and add route/component/browser-level coverage for the new operational flows and permission gating.

Post-fix review loop is now clean. Added a dedicated submission-open operations fixture plus authenticated browser coverage for load-more pagination, admin-withdraw, approve, disqualify, and non-admin gating. A second independent review returned no findings.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Built the dedicated admin-operations workspace as a separate route sibling to the setup workspace by moving the setup page to `app/pages/admin/hackathons/[hackathonId]/index.vue` and keeping `app/pages/admin/hackathons/[hackathonId]/operations.vue` focused on applications, team/submission monitoring, and admin-only interventions.

The admin workspace client layer now supports full paginated team loading through `listAllPaginatedItems`, and the operations UI now surfaces per-section load errors, preserves the loaded-team count after the last page, and keeps application review, no-submission monitoring, admin-withdraw, and disqualification on canonical admin-only paths.

Coverage now includes unit validation for the admin workspace helpers plus authenticated browser scenarios for non-admin access denial, application approval, team pagination/load-more, admin-withdraw, and disqualification in the operations workspace. Validation passed with `bunx eslint app/components/admin/AdminTeamsOperationsPanel.vue tests/bdd/steps/admin-operations.steps.ts tests/bdd/support/platform-fixtures.ts`, `bunx eslint app/components/admin/AdminApplicationsReviewPanel.vue app/components/admin/AdminSubmissionInterventionsPanel.vue 'app/pages/admin/hackathons/[hackathonId]/operations.vue' app/composables/useAdminWorkspace.ts app/utils/admin-workspace.ts tests/unit/app/utils/admin-workspace.test.ts tests/bdd/steps/admin-operations.steps.ts`, `bunx vitest run tests/unit/app/utils/admin-workspace.test.ts`, `bun run typecheck`, `node --experimental-strip-types tests/bdd/bootstrap.ts`, `./node_modules/.bin/bddgen`, and `bunx playwright test tests/bdd/features/authenticated/admin-operations.feature --project chromium-authenticated-bdd`.

A second independent review returned no findings.
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
