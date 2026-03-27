---
id: TASK-35
title: Implement hackathon role assignment UX for judges and hackathon admins
status: Done
assignee: []
created_date: '2026-03-27 02:12'
updated_date: '2026-03-27 05:06'
labels:
  - ui
  - api
  - authorization
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update hackathon admin surfaces so platform admins and hackathon admins can assign/remove judges and hackathon admins from hackathon detail workflows, including searchable user selection and role-management API permission alignment.
<!-- SECTION:DESCRIPTION:END -->

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

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented hackathon role-management parity for platform admins and hackathon admins.

Changes delivered:
- Updated role mutation authorization for `PUT/PATCH/DELETE /api/hackathons/:hackathonId/roles/:userId` to require hackathon-admin access (platform admin still works via inherited admin access).
- Added integration coverage proving hackathon admins can create/remove role assignments.
- Updated admin UI tabs from `Setup/Competition` to `Settings/Judging`.
- Settings workspace now includes searchable hackathon-admin assignment/removal using approved application users plus existing assigned users.
- Judging workspace now includes searchable judge assignment/removal and in-page judging-criteria management.
- Updated frontend role-mutation guard (`canMutateRoleAssignments`) so hackathon admins can mutate assignments.
- Updated canonical docs for role-assignment permissions and API actor rules.

Validation run:
- `bun run test:integration -- tests/integration/server/api/hackathon-admin-routes.test.ts`
- `bun run test:unit`
- `bun run typecheck`

Risk/follow-up notes:
- Existing starter UI still contains additional setup/config sections beyond the new settings/judging expectations; current implementation adds required behavior without removing other established workspace capabilities.
<!-- SECTION:FINAL_SUMMARY:END -->
