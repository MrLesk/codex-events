---
id: TASK-4.8
title: Build hackathon administration setup and lifecycle controls
status: Done
assignee:
  - codex
created_date: '2026-03-22 22:09'
updated_date: '2026-03-23 00:23'
labels:
  - frontend
  - ui
  - admin
  - configuration
milestone: m-1
dependencies:
  - TASK-3
  - TASK-4.1
documentation:
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
  - docs/design-reference.md
parent_task_id: TASK-4
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the administration surfaces needed to configure and operate a hackathon before and during participant activity. Platform admins and hackathon admins need a canonical UI for program configuration, lifecycle transitions, terms, criteria, prizes, and role management.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Authorized admins can create and update hackathon configuration, including schedules, location, images, team-size limits, and required profile flags.
- [x] #2 Authorized admins can manage current hackathon terms, evaluation criteria, prize definitions, and role assignments within canonical permissions.
- [x] #3 The UI exposes only the lifecycle actions allowed to the current admin and current hackathon state.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add admin route scaffolding and task-local admin data helpers under `app/pages/admin/**` and `app/components/admin/**`, gated by session actor data and hackathon-specific admin access.
2. Build the core admin workspace for listing accessible hackathons and opening a hackathon configuration page that shows state, schedule, location/media, team-size limits, and required-profile settings.
3. Implement create and update flows for hackathon configuration against the existing create/patch endpoints, with API error handling for schedule and slug conflicts.
4. Add management panels for terms, evaluation criteria, prizes, and explicit role assignments using the existing admin endpoints, keeping each section isolated so later tasks can extend without conflicts.
5. Add lifecycle action controls that only render valid actions for the current state and admin role, but keep post-review competition-management surfaces out of scope for `TASK-4.10`.
6. Add targeted test and doc updates for the admin configuration surface, and document the current backend UX gap for role assignment creation using manual `userId` entry until user lookup support exists.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Supervisor takeover for discovery and planning. TASK-4.8 remains implementation-blocked on TASK-4.1 shared shell work, but discovery and plan preparation are proceeding so execution can start cleanly once approved and unblocked.

Starting implementation after approved plan capture. Admin workspace will stay task-local under `app/pages/admin/**` and `app/components/admin/**`, with one shared session-actor composable and pure helper utilities. Role assignment creation will use manual `userId` entry and remain documented as a backend UX gap until a user lookup endpoint exists.

Coordination update: TASK-4.1 owns the shared shell actor/capability composable. TASK-4.8 will not introduce a competing generic session-actor primitive and will keep any additional admin gating/data helpers task-local unless the TASK-4.1 shell primitive becomes available and fits cleanly.

Clarification: this coordination note supersedes the earlier implementation note that mentioned adding a shared session-actor composable within TASK-4.8. Remaining admin authorization/data glue will stay local to the admin workspace.

Focused validation completed successfully for the admin workspace changes: `bunx eslint app/utils/admin-workspace.ts app/composables/useAdminWorkspace.ts app/components/admin/AdminWorkspaceHeader.vue app/components/admin/HackathonConfigForm.vue app/pages/admin/index.vue app/pages/admin/hackathons/new.vue 'app/pages/admin/hackathons/[hackathonId].vue' tests/unit/app/utils/admin-workspace.test.ts`, `bun run typecheck`, and `bunx vitest run tests/unit/app/utils/admin-workspace.test.ts`. Canonical docs were reviewed and remained unchanged for this task. Full UI journey automation remains part of TASK-4.12; this task adds focused helper coverage and type/lint validation for the admin setup workspace.

Independent review found follow-up fixes before TASK-4.8 can be treated as clean: gate explicit role-mutation controls to platform admins only, key/watch admin workspace caches by authenticated subject to avoid stale cross-session admin state, and close the mismatch between AC #2 and the current UI by supporting the documented update/delete management paths for criteria, prizes, and role assignments or otherwise narrowing the implementation/task scope with approval.

Reopened after independent review. Addressing three findings before the task can be considered clean: (1) gate explicit role mutation controls to platform admins only, (2) key and watch admin data queries on the authenticated subject to avoid stale cached state across account switches, and (3) close the AC #2 mismatch by adding update/delete paths for role assignments and update paths for criteria/prizes, while improving the manual userId operator workflow against existing assignment data.

Second review-fix pass completed without further `useAdminWorkspace` changes because authenticated-subject cache partitioning was already present and verified. UI fixes were limited to the hackathon admin workspace page: explicit role create/update/delete controls are now gated to platform admins only, criteria and prize records now support inline updates, and existing role assignments now expose their `userId` plus update/delete actions so the manual operator workflow remains usable until backend user lookup exists.

Focused validation reran successfully after the review-fix pass: `bunx eslint app/pages/admin/hackathons/'[hackathonId]'.vue tests/unit/app/utils/admin-workspace.test.ts app/utils/admin-workspace.ts app/composables/useAdminWorkspace.ts`, `bun run typecheck`, and `bunx vitest run tests/unit/app/utils/admin-workspace.test.ts`.

Second independent review returned no findings on the current TASK-4.8 slice. Residual risk remains limited to automation depth: the new admin mutation paths are still primarily covered by focused helper/unit validation, with broader page-level UI automation deferred to TASK-4.12.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Built the first canonical admin setup workspace for the UI milestone under `/admin`, including an admin landing page, draft hackathon creation, and a per-hackathon control surface for configuration, terms management, evaluation criteria, prize definitions, explicit role assignments, and state-aware lifecycle actions. The implementation stays aligned with the canonical docs and existing backend API surface rather than the Figma reference components or starter shell behavior.

Key implementation pieces include the admin workspace helper module in `app/utils/admin-workspace.ts`, task-local admin data loading in `app/composables/useAdminWorkspace.ts`, reusable admin presentation components in `app/components/admin/**`, and the new admin pages in `app/pages/admin/**`. Lifecycle action availability is derived from the same guard semantics used by the backend so the UI exposes only the allowed next action for the current state. `/admin` routes now exist and are protected by the same authenticated-session pattern already used elsewhere in the app.

Validation completed with focused checks for this task: `bunx eslint app/utils/admin-workspace.ts app/composables/useAdminWorkspace.ts app/components/admin/AdminWorkspaceHeader.vue app/components/admin/HackathonConfigForm.vue app/pages/admin/index.vue app/pages/admin/hackathons/new.vue 'app/pages/admin/hackathons/[hackathonId].vue' tests/unit/app/utils/admin-workspace.test.ts`, `bun run typecheck`, and `bunx vitest run tests/unit/app/utils/admin-workspace.test.ts`. Canonical docs were reviewed and remained unchanged. Residual risk and follow-up: explicit role assignment creation currently uses manual `userId` entry because the backend does not yet expose a canonical admin user lookup surface; that UX gap is documented and should be revisited when such an endpoint exists. Full UI journey automation for the admin workspace remains part of TASK-4.12 rather than this task.

Second review fix pass closed the remaining TASK-4.8 gaps: explicit role-assignment mutation controls are now rendered only for platform admins, criteria and prizes now support inline update flows, and existing role assignments now surface the exact `userId` needed for follow-up edits or removal while also supporting update/delete actions. The authenticated-subject cache partitioning in `useAdminWorkspace` was rechecked and required no additional code changes.

The manual `userId` workflow remains only for creating new explicit role assignments because the backend still does not expose a canonical admin user lookup surface. That UX gap remains documented, but the list now exposes reusable `userId` values so operators can complete update and delete actions cleanly.
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
