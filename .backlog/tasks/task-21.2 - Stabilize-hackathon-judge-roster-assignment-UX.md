---
id: TASK-21.2
title: Stabilize hackathon judge roster assignment UX
status: Done
assignee:
  - '@codex'
created_date: '2026-03-28 23:56'
updated_date: '2026-03-29 00:10'
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
Update the hackathon role-roster interaction so assigning a judge does not move that person to a different section of the page. Keep the roster stable in-place and change the action state on the existing row instead of reordering or relocating the user after assignment. Preserve the existing permissions and role-assignment API behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Assigning or removing a judge in the Judges tab updates the same visible row in place instead of moving that user between separate sections
- [x] #2 The Judges tab still makes the current assignment state clear and still supports search by name, email, or user ID
- [x] #3 Role-assignment permissions and backend behavior remain unchanged
- [x] #4 Relevant unit coverage is updated for the stable-row roster logic, and bun run test:unit is run locally
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Replace the current split assignable/assigned roster derivation with a single stable role-roster row model that preserves one sorted row per user and marks whether that user currently holds the target role.
2. Update the shared hackathon role-roster panel to render one filtered list, show assignment state inline, and toggle the row action between assign and remove without moving the row to another section.
3. Keep the existing role-assignment API calls and permissions unchanged, update the helper unit tests for stable-row behavior, and run `bun run test:unit`.

4. Preserve previously visible roster users in the client-side roster source so removing a currently assigned judge does not make that row disappear when no application record exists for that user.

5. Replace the roster candidate source with all active platform users so Judges and Staff tabs can assign platform admins, regular users, and previously removed assignees across refreshes.

Extend GET /api/hackathons/:hackathonId/roles to return all active candidate users in list metadata while keeping data as explicit assignments.

Refactor the hackathon role roster workspace and panel to consume server-provided candidate users instead of applications.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Reworked the shared role-roster source so Judges and Staff no longer derive visible users from approved applications plus current assignments.

Extended GET /api/hackathons/:hackathonId/roles to keep returning explicit assignments in `data` and now include all active users in `meta.candidateUsers`, using the same role-user summary shape as assignment payloads.

Updated the roster workspace and panel to consume `candidateUsers` from the roles response, removed the applications dependency from that flow, and kept the stable row behavior by merging current assignments with candidate users in the shared roster helper.

This fixes the durable source bug for platform admins, regular users, and removed assignees across refreshes in both Judges and Staff.

Validation: `bun run test:unit`, `bun run test:integration -- tests/integration/server/api/hackathon-admin-routes.test.ts`, and `bun run typecheck` passed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Made the Judges and Staff rosters durable by changing their source from approved applications plus current assignments to all active users.

What changed:
- The hackathon roles list route now returns active candidate users in `meta.candidateUsers` while preserving existing assignment data in `data`.
- The shared role-roster workspace and panel now use that candidate-user source directly instead of fetching applications.
- The shared roster helper still merges in current assignments so assigned users remain visible even if they are missing from the active candidate list.
- Staff and Judges can now assign platform admins, regular users, and previously removed assignees after refreshes.

Validation:
- `bun run test:unit` passed.
- `bun run test:integration -- tests/integration/server/api/hackathon-admin-routes.test.ts` passed.
- `bun run typecheck` passed.

Docs/config:
- Canonical docs were confirmed unchanged.
- No config or workflow documentation updates were required.

Risks/follow-ups:
- The roster now lists all active users, so search remains important on hackathons with large user counts.
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
