---
id: TASK-349
title: Restore creator administration for created events
status: Done
assignee:
  - '@Codex'
created_date: '2026-05-31 19:04'
updated_date: '2026-05-31 19:08'
labels:
  - bug
  - events
  - permissions
dependencies: []
modified_files:
  - app/composables/useAdminWorkspace.ts
  - tests/unit/app/composables/useAdminWorkspace.test.ts
priority: high
ordinal: 52000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When a user creates an event, that creator must retain the event administration permissions needed to edit and administer the event instead of seeing a participant-style event view with no admin actions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A newly created event is associated with the creating user as an event administrator or equivalent permitted staff role.
- [x] #2 The creator can access the event administration/edit controls immediately after creation.
- [x] #3 Participant-facing event access remains unchanged for users who do not hold event administration permissions.
- [x] #4 The behavior is covered by focused tests or an explicit documented test gap if automation is not practical.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Keep the backend role-assignment model unchanged because `POST /api/events` already creates the creator `event_admin` assignment and existing integration coverage verifies it.
2. Update the admin workspace refresh path so a successful event creation refreshes the shared `session-actor:{subject}` cache used by the account event workspace and shell.
3. Add focused unit coverage for the refresh behavior so future admin mutations do not refresh only the private admin-workspace session.
4. Run targeted unit tests, then the required validation commands for this code change.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Discovery: canonical docs and existing integration tests confirm newly created events must assign the creator as `event_admin`. The observed UI state is consistent with `/api/account/events` seeing the new role while the shared `useSessionActor()` cache still has the pre-create role list.

Implemented the fix by refreshing the shared `session-actor:{subject}` Nuxt data key from `useAdminWorkspace.refreshRoot()`, so event creation and other admin root refreshes update the actor role list used by account event workspaces. Added unit coverage for the refresh behavior. Validation passed: `bun run test:unit -- tests/unit/app/composables/useAdminWorkspace.test.ts` (project script ran all unit tests: 102 files, 646 tests), `bun run lint`, and `bun run typecheck`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Summary:
- Refreshed the shared `session-actor:{subject}` cache whenever the admin workspace root refreshes, so a creator's new `event_admin` assignment is visible before navigating to the newly created event workspace.
- Added focused unit coverage for `useAdminWorkspace.refreshRoot()` to prevent regressions where only the private admin session is refreshed.

Validation:
- `bun run test:unit -- tests/unit/app/composables/useAdminWorkspace.test.ts` (script ran all unit tests: 102 files, 646 tests)
- `bun run lint`
- `bun run typecheck`

Risks and follow-ups:
- No canonical docs or configuration changes were needed; the backend role-assignment behavior already matched the documented model.
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
