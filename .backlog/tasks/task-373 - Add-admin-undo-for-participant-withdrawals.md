---
id: TASK-373
title: Add admin undo for participant withdrawals
status: Done
assignee:
  - Codex
created_date: '2026-06-04 18:54'
updated_date: '2026-06-04 19:04'
labels:
  - applications
  - admin
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
modified_files:
  - app/components/account/events/AccountEventAdminOperationsPanel.vue
  - app/components/account/events/AccountEventParticipantVisibilityPanel.vue
  - app/components/account/events/AccountEventParticipantsPanel.vue
  - app/components/applications/AdminApplicationsReviewPanel.vue
  - app/domains/applications/admin-application-review.ts
  - docs/api-surface.md
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/permissions-matrix.md
  - 'server/api/events/[eventId]/applications/index.post.ts'
  - >-
    server/api/events/[eventId]/applications/[applicationId]/actions/undo-withdrawal.post.ts
  - server/domains/applications/review-finalization.ts
  - tests/integration/server/api/application-routes.test.ts
  - tests/unit/app/domains/applications/admin-application-review.test.ts
priority: medium
ordinal: 69000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a simple admin action that restores withdrawn participant applications while registration is open. The action should reuse the same post-registration outcome rules: auto-approve when enabled and capacity is available, otherwise return the application to submitted review. It must not add new eligibility objects/statuses, withdrawal-source checks, or team-side-effect restoration.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Event admins and platform admins can undo a withdrawn application only while the event is in registration_open.
- [x] #2 Undo clears withdrawal/review/check-in/staged decision fields and re-enters the standard post-registration outcome flow.
- [x] #3 When auto-approval is enabled and capacity is available, undo approves the application immediately and uses the existing approval email and Luma approval sync flow.
- [x] #4 When auto-approval is disabled or capacity is full, undo leaves the application submitted for normal admin review without decision side effects.
- [x] #5 The admin participants UI shows an Undo action for withdrawn rows only during registration_open.
- [x] #6 Canonical docs describe the undo transition and API route.
- [x] #7 Integration/UI coverage verifies submitted restore, auto-approved restore, capacity-full behavior, Luma sync, permissions, and registration-closed blocking.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extract shared post-registration outcome logic from application submission into the applications domain so registration and undo use the same auto-approval/capacity/finalization behavior.
2. Add POST /api/events/:eventId/applications/:applicationId/actions/undo-withdrawal for event/platform admins. Require registration_open via existing application-open guard, require application status withdrawn, clear withdrawn/review/check-in/pre-approval fields, then run the shared post-registration outcome flow. Do not restore team side effects and do not add eligibility/source checks.
3. Wire the admin participants UI: pass event state down, emit undo from withdrawn rows only when state is registration_open, and call the new endpoint from AccountEventAdminOperationsPanel with existing mutation refresh/toast behavior.
4. Update canonical docs for the new transition, permission, and API route.
5. Add integration coverage for submitted restore, auto-approved restore, capacity full, Luma approval sync, permission denial, and registration-closed blocking; add UI/domain/component coverage for Undo visibility if existing tests support it.
6. Run required validation, update Backlog acceptance criteria/final summary, commit TASK-373 changes, and push to origin/main.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented the simplified plan without adding adminWithdrawalUndo, source eligibility checks, new application statuses, team restoration, or schema changes. Registration and undo now share the same post-registration auto-approval/finalization helper.

Validation passed: bun run lint; bun run typecheck; bun run test:unit; bun run test:integration; bun run test:bdd; git diff --check.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a simple admin undo-withdrawal action for participant applications. The new route restores withdrawn applications only while registration is open, clears withdrawal/review/check-in/staged-decision fields, and then runs the shared post-registration outcome flow so auto-approval, participant email, and Luma approval sync behavior match new registration handling. The admin participants UI now shows Undo on withdrawn rows only during registration_open.

Updated canonical application docs, lifecycle transitions, permissions, and API surface. Added integration coverage for submitted restore, auto-approved restore, capacity-full restore, Luma approval sync, staff denial, and registration-closed blocking, plus app-domain coverage for the Undo visibility rule.

Validation passed: bun run lint; bun run typecheck; bun run test:unit; bun run test:integration; bun run test:bdd; git diff --check.
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
