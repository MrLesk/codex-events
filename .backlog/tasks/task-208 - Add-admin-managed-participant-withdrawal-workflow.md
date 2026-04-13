---
id: TASK-208
title: Add admin-managed participant withdrawal workflow
status: Done
assignee: []
created_date: '2026-04-13 15:59'
updated_date: '2026-04-13 16:13'
labels: []
dependencies: []
references:
  - app/components/account/hackathons/AccountHackathonAdminOperationsPanel.vue
  - app/components/admin/AdminApplicationsReviewPanel.vue
  - 'server/api/hackathons/[hackathonId]/applications/me/actions/withdraw.post.ts'
  - server/utils/applications.ts
  - server/utils/team-formation.ts
documentation:
  - docs/domain-model.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
  - docs/lifecycle-and-state-machines.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Allow hackathon admins and platform admins to manually withdraw participant applications from the account hackathon Participants tab when participants ask staff to withdraw them. The workflow must surface withdrawn applications as a first-class participant filter and apply the canonical withdrawal side effects for application state, team access, audit history, and Luma sync. Admin withdrawal may target submitted and approved applications. If the participant still has an active team, remove that team membership when the team can continue safely. If withdrawing the participant would dismantle the team, allow it only when no submission would be affected; warn admins when the team will be dismantled. If dismantling the team would affect an existing submission, block the participant withdrawal.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Hackathon admins and platform admins can manually withdraw submitted and approved participant applications from the account hackathon Participants tab
- [x] #2 The Participants tab includes a separate Withdrawn filter that lists withdrawn applications with their withdrawal status and existing participant details
- [x] #3 Admin-managed withdrawal updates the application to withdrawn records audit history and performs the same Luma rejection sync path used by participant self-withdrawal when Luma sync is enabled
- [x] #4 Admin-managed withdrawal removes the participant from any active team when the team can remain valid and warns admins when the action will dismantle the team
- [x] #5 Admin-managed withdrawal is blocked when dismantling the team would affect an existing submission and the UI explains why the action is unavailable
- [x] #6 Canonical docs tests and validations are updated to reflect the admin-managed withdrawal workflow and its team-handling rules
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend application serialization and admin application list responses with withdrawal availability metadata.
2. Add an admin-only application withdrawal route that mirrors participant withdrawal side effects, removes the participant from teams when safe, dissolves teams when required, and blocks withdrawal when dismantling would affect an active submission.
3. Update the account hackathon Participants tab and review panel to expose a Withdrawn filter, withdraw actions for submitted and approved applications, and warning or blocked-state messaging.
4. Refresh automated coverage and canonical docs for the admin-managed withdrawal workflow and team-handling rules.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Admin withdrawal reuses the same Luma rejection queue path as participant self-withdraw when Luma sync is enabled, preserving existing sync semantics.

Team dissolution in the admin route removes non-target active members before the withdrawing last admin to satisfy the active-admin database invariant during batched updates.

Validated the new route with targeted integration coverage for member removal, solo-team dissolution, last-admin dissolution, active-submission blocking, and Luma queue enqueue behavior.

Repo validation results: `bun run lint` passed, `bun run typecheck` passed after normalizing `findFirst()` to `null`, and `bun run test:unit` passed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented admin-managed participant withdrawal across the hackathon Participants tab and backend application workflow. Hackathon admins and platform admins can now withdraw submitted or approved applications from the admin participants workspace, and withdrawn applications appear in a dedicated Withdrawn filter with status and timestamp visibility.

On the backend, the new admin withdrawal route applies the canonical withdrawal transition, records audit history, and reuses the existing Luma rejection sync path when Luma sync is enabled. The route evaluates the participant's current team state before withdrawing: it removes the participant from the active team when the team can remain valid, dissolves the team when the participant is the last active member or last active admin, rejects pending join requests for dissolved teams, and blocks the withdrawal when dismantling would affect an active draft, submitted, or locked submission.

Updated canonical docs in `docs/domain-model.md`, `docs/lifecycle-and-state-machines.md`, `docs/permissions-matrix.md`, and `docs/api-surface.md` to reflect the new admin-managed withdrawal rules. Added and refreshed automated coverage in unit and integration tests, including admin withdrawal edge cases for team handling and Luma sync behavior. Validation run: `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bun x vitest run --config vitest.integration.config.ts tests/integration/server/api/application-routes.test.ts`.
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
