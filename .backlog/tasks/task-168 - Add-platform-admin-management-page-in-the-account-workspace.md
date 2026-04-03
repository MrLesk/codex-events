---
id: TASK-168
title: Add platform-admin management page in the account workspace
status: Done
assignee:
  - codex
created_date: '2026-04-03 14:45'
updated_date: '2026-04-03 14:55'
labels:
  - admin
  - platform-admin
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Allow platform admins to manage platform-admin membership from the authenticated account workspace through a dedicated `/account/platform-admins` page. The page should follow the established roster-management UX: show the current platform admins first, then let platform admins search across active users and promote additional users from the same surface. Keep the behavior aligned with the canonical docs and existing account admin patterns rather than introducing a separate admin workflow.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Platform admins can open `/account/platform-admins` in the account workspace and see the current platform-admin roster at the top of the page.
- [x] #2 The page shows a searchable list of active users below the roster using the existing fuzzy-search pattern already used for admin candidate search, with stable pagination or load-more behavior.
- [x] #3 A platform admin can promote an active non-platform-admin user from this page and the UI refreshes to reflect the updated roster state without exposing users who are already deleted.
- [x] #4 Canonical docs and automated coverage are updated for the new platform-admin management behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the canonical docs for platform-admin management so the domain model, permissions matrix, and API surface describe platform admins granting platform-admin access from the account workspace.
2. Extract or add shared platform-admin grant logic that preserves the existing invariant: promoting a user to platform admin also normalizes hackathon-admin assignments across all hackathons and writes an audit record.
3. Add platform-admin-only API routes to list current platform admins, search active-user candidates with the same fuzzy search semantics used by hackathon role candidates, and grant platform-admin access to a target user.
4. Add a dedicated `/account/platform-admins` page guarded by platform-admin access, using the roster-style UI pattern with current admins on top and searchable candidates below.
5. Add a discoverable entry point from the account admin dashboard and keep the Admin dashboard shell navigation active while the platform-admin page is open.
6. Extend automated coverage for the new API and navigation or page logic, then run `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented a dedicated `/account/platform-admins` page and reused the existing roster-management UX conventions: current admins on top, debounced fuzzy user search below, load-more pagination, and disabled already-admin states.

Added shared server-side platform-admin grant logic so runtime promotion and the bootstrap tool use the same invariant: set `is_platform_admin`, normalize explicit `hackathon_admin` coverage across every hackathon, and write a user audit record.

Validation run completed: `bun x vitest run tests/integration/server/api/platform-admin-routes.test.ts tests/unit/app/utils/shell-navigation.test.ts tests/unit/tools/platform-admin-bootstrap.test.ts`, `bun run lint`, `bun run typecheck`, and `bun run test:unit`. Added an Auth0-backed BDD API scenario for platform-admin promotion but did not run `bun run test:bdd` locally in this pass.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added platform-admin management to the authenticated account admin workspace with a dedicated `/account/platform-admins` page and a small admin-dashboard entry point. The new page follows the existing roster-management pattern: current platform admins appear first, candidate users are searchable with the same debounced fuzzy matching over display name, email, and user ID, and non-admin users can be promoted directly from the roster surface.

Implemented a new platform-admin API surface with list, candidate-search, and grant routes, and introduced shared server-side promotion logic so the new runtime flow and the existing bootstrap tool both enforce the same invariant. Granting platform-admin access now does more than flip `is_platform_admin`: it also normalizes explicit `hackathon_admin` assignment coverage across all hackathons and writes an audit record.

Updated the canonical docs in `docs/domain-model.md`, `docs/permissions-matrix.md`, and `docs/api-surface.md` to describe platform-admin promotion and the new API surface. Coverage was added in targeted integration tests for the new routes, shell-navigation unit coverage for keeping the Admin dashboard active on the new page, and an Auth0-backed BDD API scenario for platform-admin promotion. Validation run: `bun x vitest run tests/integration/server/api/platform-admin-routes.test.ts tests/unit/app/utils/shell-navigation.test.ts tests/unit/tools/platform-admin-bootstrap.test.ts`, `bun run lint`, `bun run typecheck`, and `bun run test:unit`. `bun run test:bdd` was not run locally in this pass.
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
