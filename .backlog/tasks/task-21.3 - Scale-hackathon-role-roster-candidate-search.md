---
id: TASK-21.3
title: Scale hackathon role roster candidate search
status: Done
assignee:
  - '@codex'
created_date: '2026-03-29 11:58'
updated_date: '2026-03-29 13:16'
labels: []
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
parent_task_id: TASK-21
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the hackathon Judges and Staff roster management flow so it remains usable when the platform has a large number of users. Keep current judge and hackathon-admin assignments easy to review, replace the current all-users roster download with a searchable paginated candidate lookup, and prioritize platform admins and current hackathon admins at the top of candidate results.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The Judges and Staff tabs keep current role assignments visible without requiring the admin to page through the candidate list.
- [x] #2 Candidate lookup for role assignment uses server-side search and pagination instead of loading every active user in one response.
- [x] #3 Admins can search candidates by display name email or user ID and load additional result pages without losing current assignment context.
- [x] #4 Platform admins and current hackathon admins sort to the top of matching candidate results in both the Judges and Staff tabs.
- [x] #5 Role assignment and removal continue to work for platform admins hackathon admins judges and regular users with updated tests covering the new route and roster behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a dedicated admin-only role-candidates list route with page/page_size/search and priority ordering for platform admins and current hackathon admins.
2. Remove the all-active-users payload from the existing roles list route so it returns assignments only.
3. Refactor the shared role-roster panel to keep assignments visible, fetch candidate results separately with server-side search and Load more, and preserve assign/remove actions.
4. Update route and roster tests and run unit, targeted integration, and typecheck validation.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added a dedicated admin-only `GET /api/hackathons/:hackathonId/roles/candidates` route with `page`, `page_size`, and `search` query support so the roster no longer downloads every active user in the existing roles list response.

The candidate route filters to active users, supports display-name, email, and user-ID search, and orders matching users with platform admins first, current hackathon admins second, then display name, email, and user ID.

Refactored the shared hackathon role-roster panel to keep current assignments visible in a dedicated assigned section while loading candidate results separately with server-side search and a Load more action. Role assignment and removal still operate on the same existing mutation endpoints.

Removed candidate-user payloads from the existing roles list route so it returns assignments only again, and updated the shared roster helpers to build assigned rows separately from paginated candidate rows.

Follow-up fix: removed the redundant roster-side admin-access fallback state and simplified the roster workspace so it refreshes only the role assignments request. Also fixed the candidate ordering query to omit the current-hackathon-admin sort expression when there are no current hackathon admins, which avoids invalid `ORDER BY 0 DESC` SQL on D1.

Validation: `bun run test:unit`, `bun run test:integration -- tests/integration/server/api/hackathon-admin-routes.test.ts`, `bun run typecheck`, and `bun run dev` startup all passed.

UX cleanup: simplified the Judges and Staff roster panel for the admin actor by removing always-visible user IDs, replacing the technical sorting explanation with authority badges, renaming the search section to an add action, and hiding already-assigned people from the default add list while still showing them when a direct search matches them.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Scaled the Judges and Staff role roster flow for larger user counts and then patched the first follow-up bugs.

What changed:
- Added a new admin-only paginated candidate-search route for role assignment.
- Restored the existing roles list route to assignments-only so it no longer returns every active user.
- Updated the shared roster panel to show current assignments in a dedicated section and load candidate users separately with server-side search and Load more.
- Candidate results prioritize platform admins first and current hackathon admins second in both the Judges and Staff tabs.
- Removed the redundant roster-side admin-access fallback state because upstream routing and authorization already prevent that path.
- Fixed the no-hackathon-admin candidate-query case so the route no longer emits invalid SQL.

Validation:
- `bun run test:unit` passed.
- `bun run test:integration -- tests/integration/server/api/hackathon-admin-routes.test.ts` passed.
- `bun run typecheck` passed.
- `bun run dev` startup passed.

Docs/config:
- Canonical docs were confirmed unchanged.
- `AGENTS.md` now explicitly instructs agents not to bloat code or add unnecessary fallbacks.

Risks/follow-ups:
- Candidate search is offset-paginated, which is fine at the current expected scale; if the user base grows substantially further, cursor pagination would be the next scaling step.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [x] #4 Tests were added or updated when behavior changed
- [ ] #5 Test gaps are documented when automation is not practical
- [x] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
