---
id: TASK-317
title: Remove platform admins and event organizers
status: Done
assignee:
  - Codex
created_date: '2026-05-26 21:21'
updated_date: '2026-05-26 21:32'
labels:
  - admin
  - access-control
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
modified_files:
  - app/components/account/AccountEventOrganizerRosterPanel.vue
  - app/components/account/AccountPlatformAdminRosterPanel.vue
  - docs/api-surface.md
  - docs/domain-model.md
  - docs/permissions-matrix.md
  - 'server/api/event-organizers/[userId].delete.ts'
  - 'server/api/platform-admins/[userId].delete.ts'
  - server/domains/platform/admins.ts
  - server/domains/platform/event-organizers.ts
  - tests/integration/server/api/event-organizer-routes.test.ts
  - tests/integration/server/api/platform-admin-routes.test.ts
priority: medium
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add platform-admin controls to revoke platform-admin and event-organizer access from active users. Removing a platform admin clears only platform-wide admin access and preserves existing event role assignments.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Platform admins can remove event-organizer access from a current event organizer through the account admin UI and API.
- [x] #2 Platform admins can remove platform-admin access from a current platform admin through the account admin UI and API.
- [x] #3 Removing platform-admin access clears only the user's platform-admin flag and does not delete or change existing event role assignments.
- [x] #4 Removal operations are restricted to platform admins and write audit records only when a role is actually revoked.
- [x] #5 Canonical docs describe the removal permissions and API operations.
- [x] #6 Relevant integration and UI-adjacent behavior are covered by tests, and required validation passes locally.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add platform-domain removal functions and DELETE /api/platform-admins/:userId / DELETE /api/event-organizers/:userId route handlers using existing platform-admin authorization, active-user lookup, apiData responses, and audit-log conventions.
2. Update integration tests for platform-admin and event-organizer routes to cover removal, platform-admin-only enforcement, audit records, and preserving existing event role assignments when platform-admin access is removed.
3. Add remove actions to AccountPlatformAdminRosterPanel.vue and AccountEventOrganizerRosterPanel.vue, reusing existing pending mutation state, toast, refresh, and error patterns without introducing extra UI surfaces.
4. Update canonical docs in docs/permissions-matrix.md and docs/api-surface.md; update docs/domain-model.md only where the role rules need the new removal behavior stated.
5. Run targeted integration tests for these route files, then run bun run lint, bun run typecheck, and bun run test:unit before handoff.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Initial discovery: platform-admin and event-organizer grant flows already exist as platform-admin-only PUT routes with roster/candidate UI panels. User confirmed platform-admin removal should clear only is_platform_admin and preserve existing event role assignments.

Validation passed: targeted integration tests for platform-admin/event-organizer routes, bun run lint, bun run typecheck, and bun run test:unit. Browser smoke check was not run because the in-app Browser tool was not exposed in this session after tool discovery.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added platform-admin-only DELETE routes for platform admins and event organizers, with domain functions that clear the relevant user flag and write audit records only when access is actually revoked. Platform-admin removal intentionally preserves existing event-specific role assignments, matching the confirmed product scope.

Updated the account admin roster panels with remove actions, confirmation prompts, loading state, toast feedback, and roster/candidate refresh behavior. Updated canonical product/API docs to include the new removal permissions and route contracts.

Extended integration coverage for platform-admin and event-organizer management to verify removal persistence, authorization, audit records, no-op removals without extra audit rows, and preserved event assignments after platform-admin removal. Validation passed: targeted integration route tests, bun run lint, bun run typecheck, and bun run test:unit.
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
