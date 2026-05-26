---
id: TASK-318
title: Consolidate platform settings into tabbed page
status: Done
assignee:
  - Codex
created_date: '2026-05-26 21:39'
updated_date: '2026-05-26 21:44'
labels:
  - platform-admin
  - navigation
  - frontend
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
modified_files:
  - app/components/AppUserMenu.vue
  - app/components/account/AccountPlatformLegalSettingsPanel.vue
  - app/composables/useShellNavigation.ts
  - app/domains/accounts/shell-navigation.ts
  - app/pages/account/admin.vue
  - app/pages/account/event-organizers.vue
  - app/pages/account/platform-admins.vue
  - app/pages/account/platform-legal.vue
  - app/pages/account/platform-settings.vue
  - tests/unit/app/domains/accounts/navigation-guards.test.ts
  - tests/unit/app/domains/accounts/shell-navigation.test.ts
priority: medium
ordinal: 21000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Move platform-admin legal settings, event-organizer management, and platform-admin management out of separate account pages and into one platform-admin-only Platform settings page with account-event-style tabs. Remove the three platform-wide settings buttons from the Admin dashboard and add Platform settings to the sidebar and profile menu for platform admins.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Platform admins can access a single Platform settings page with Legal settings, Manage event organizers, and Manage platform admins tabs.
- [x] #2 The Platform settings page uses the same query-backed tab navigation pattern as the account event page.
- [x] #3 The Admin dashboard no longer exposes the three platform-wide settings buttons and remains focused on event management and event creation.
- [x] #4 The sidebar and profile menu show a Platform settings entry only for platform admins.
- [x] #5 The old platform legal, event organizers, and platform admins account pages are removed without compatibility redirects.
- [x] #6 Shell navigation active-state behavior distinguishes Platform settings from the Admin dashboard.
- [x] #7 Relevant unit tests are updated, and required validation passes locally.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extract the current platform legal settings page body into a reusable account component while preserving existing legal settings/document fetch, save, publish, alert, and toast behavior.
2. Add a platform-admin-only /account/platform-settings page with query-backed tabs (legal, event-organizers, platform-admins), account-event-style tab markup, and tab panels that render the legal settings component plus the existing event-organizer and platform-admin roster panels.
3. Remove the three old account pages (/account/platform-legal, /account/event-organizers, /account/platform-admins) without adding redirects or fallback routes.
4. Update the Admin dashboard to remove the three platform-wide settings buttons while keeping Create event and the event lists unchanged.
5. Update shell navigation and profile menu so Platform settings appears only for platform admins, after Admin dashboard, and active-state logic treats /account/platform-settings separately from /account/admin.
6. Update unit tests for shell active-state logic and navigation guards for platform settings access.
7. Run targeted unit tests, then bun run lint, bun run typecheck, and bun run test:unit. If feasible after validation, start the dev server and smoke-check the new page tabs and nav visibility.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented as a UI/navigation consolidation with no backend API or canonical product-doc changes. Validation passed: targeted account navigation tests, bun run lint, bun run typecheck, and bun run test:unit. Dev server started on localhost:3001; unauthenticated requests to all three new tab URLs compiled and redirected to login with the expected returnTo paths. Authenticated visual smoke was not available in this session.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Created a platform-admin-only /account/platform-settings page with account-event-style query-backed tabs for Legal settings, Manage event organizers, and Manage platform admins. Extracted the existing legal settings UI into a reusable account panel and reused the existing roster panels for access management.

Removed the old standalone account pages for platform legal settings, event organizers, and platform admins without adding redirects. Removed the three platform-wide settings buttons from the Admin dashboard, and added Platform settings as a platform-admin-only sidebar and profile menu entry. Updated shell active-state logic so Platform settings is distinct from Admin dashboard.

Updated unit coverage for shell navigation active states and platform-settings route guard behavior. Validation passed: targeted account navigation tests, bun run lint, bun run typecheck, and bun run test:unit. Dev server smoke confirmed the new tab URLs compile and redirect unauthenticated users with expected returnTo paths; authenticated visual smoke was not available in this session.
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
