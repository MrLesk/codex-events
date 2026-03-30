---
id: TASK-120.2
title: Implement hackathon staff authorization and role-assignment model
status: Done
assignee:
  - codex
created_date: '2026-03-30 16:55'
updated_date: '2026-03-30 17:47'
labels:
  - backend
  - auth
  - roles
  - permissions
dependencies:
  - TASK-120.1
documentation:
  - docs/domain-model.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
  - docs/schema-outline.md
parent_task_id: TASK-120
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the backend changes required for the canonical `staff` role model. Staff is a hackathon-scoped read-only internal capability for participant and team visibility. Non-admin staff and judges remain distinct roles. Hackathon admins may additionally opt into staff visibility and judging through separate flags. Update schema, role-assignment validation, authorization helpers, and affected API handlers so staff access and admin restrictions are enforced consistently.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The persisted role-assignment model supports the canonical `staff` capability and the admin-only staff and judging flags described by the docs.
- [x] #2 Authorization helpers and API guards allow staff to view participant and team data while denying admin operations.
- [x] #3 Non-admin staff and judges remain mutually exclusive in write paths and validation rules.
- [x] #4 Affected backend tests cover the new staff access rules and role-composition constraints.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Keep the already-landed schema and migration changes that add `staff` to `hackathonRoleAssignment` and add the admin-only `is_staff` capability flag alongside `is_in_judge_pool`.
2. Finish the role-capability invariant rollout by updating any remaining consumers and tests to use the shared `assertRoleCapabilityInvariant` model: `judge` requires `isInJudgePool=true` and `isStaff=false`; `staff` requires `isStaff=true` and `isInJudgePool=false`; `hackathon_admin` may toggle both flags independently.
3. Tighten `server/auth/authorization.ts` so non-platform admin judging access is flag-driven rather than blanket admin access. Admin operational access must remain available where the product docs allow it, but blind-review access through assignments must require judging-enabled admin participation.
4. Extend internal hackathon visibility helpers so explicit `staff` assignments can see the internal participant and team surfaces, including draft or internal hackathon visibility where the current code only checks admin assignments.
5. Finish the affected read-path guards and handlers for application and team visibility so staff gains the documented read-only access without unlocking write operations or team-admin powers.
6. Update the closest existing backend tests to match the canonical model and the current worktree delta: schema checks, hackathon-management unit tests, authorization unit/integration tests, role-assignment route tests, application route tests, and team-formation route tests.
7. Run focused backend tests first, then `bun run lint`, `bun run typecheck`, and `bun run test:unit`, and record any unrelated pre-existing failures explicitly.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented the canonical hackathon staff backend model end to end. The persisted role assignment now supports the explicit `staff` role plus the admin-only `isStaff` and `isInJudgePool` capability flags, and validation enforces the documented combinations for `judge`, `staff`, and `hackathon_admin`. Authorization and read-path guards were updated so staff can see participant applications and team membership detail without receiving admin operations, while blind judging access is now assignment-driven and separate from admin operational access. Judging assignment listing, shortlist, and leaderboard access were aligned with the new boundary, and admin assignment actions now use an admin-only context instead of the blind-review gate. Updated unit and integration coverage across schema, role management, auth, application visibility, team visibility, and judging routes. Validation passed with `bun run lint` (existing `vue/no-v-html` warnings only), `bun run typecheck`, `bun run test:unit`, plus focused integration runs for authorization, hackathon-admin routes, application routes, team-formation routes, judging routes, and outcome routes. No additional test gaps or follow-up risks remain for this backend slice; TASK-120.3 will cover the internal UI and route-management surfaces that consume these auth changes.
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
