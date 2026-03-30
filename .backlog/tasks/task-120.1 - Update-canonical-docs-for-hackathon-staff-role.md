---
id: TASK-120.1
title: Update canonical docs for hackathon staff role
status: Done
assignee:
  - codex
created_date: '2026-03-30 16:55'
updated_date: '2026-03-30 17:17'
labels:
  - docs
  - roles
  - permissions
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
  - docs/schema-outline.md
  - docs/testing-strategy.md
parent_task_id: TASK-120
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the canonical documentation to introduce a hackathon-scoped `staff` capability. Staff can see all participants and teams for a hackathon but cannot perform admin operations. Non-admin staff and judges remain distinct. Hackathon admins may additionally opt into staff visibility and judging through separate flags. Update every affected canonical document so the role model, permissions, API surface, schema outline, and testing expectations are internally consistent.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The canonical docs define `staff` alongside existing hackathon roles and describe its scope clearly.
- [x] #2 The permissions docs make clear that staff can view participant and team data but cannot perform admin actions.
- [x] #3 The API and schema docs describe any required role-assignment shape changes and access rules without introducing backward-compatibility fallbacks.
- [x] #4 Testing documentation reflects the role model changes where actor coverage or fixtures need to change.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update `docs/domain-model.md` to redefine `HackathonRoleAssignment` around three explicit roles: `hackathon_admin`, `judge`, and `staff`, while keeping one explicit role per user per hackathon and documenting two flags: `is_in_judge_pool` and `is_staff`.
2. Update `docs/permissions-matrix.md` to add the `staff` actor, remove the statement that `hackathon_admin` automatically includes judge permissions, and document that only admins may additionally enable judge participation and/or staff visibility through the separate flags.
3. Update `docs/api-surface.md` to expand the hackathon roles domain from admin and judge assignments to admin, judge, and staff assignments plus the two flags, and to document which read operations staff may access without admin write authority.
4. Update `docs/schema-outline.md` to add `staff` to the hackathon role enum, add an `is_staff` field to `HackathonRoleAssignment`, and describe the canonical flag constraints for `judge`, `staff`, and `hackathon_admin` rows.
5. Update `docs/testing-strategy.md` where needed so role-based coverage and fixture guidance reflect the new staff role and the admin-plus-staff/admin-plus-judge flag combinations.
6. Re-read the touched docs for internal consistency, then run `bun run lint`, `bun run typecheck`, and `bun run test:unit` as required by repo policy and document any pre-existing failures that are unrelated to this docs-only task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Verified the current workspace docs for `domain-model`, `permissions-matrix`, `api-surface`, `schema-outline`, and `testing-strategy` against the approved staff-role plan. The canonical model now defines hackathon-scoped `staff`, keeps one explicit hackathon role per user per hackathon, adds `is_staff` as the admin-only parallel to `is_in_judge_pool`, and removes the prior assumption that hackathon admins automatically judge.

Validation run from the current repo state: `bun run lint` completed with 6 existing `vue/no-v-html` warnings in public/legal pages, `bun run typecheck` passed, `bun run test:unit` failed due to an unrelated existing failure in `tests/unit/server/utils/hackathon-management.test.ts` referencing `assertRoleJudgePoolInvariant`, and `git diff --check` passed for the touched docs.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Current workspace docs now define the canonical separation between hackathon `staff`, `judge`, and `hackathon_admin`. `docs/domain-model.md`, `docs/permissions-matrix.md`, `docs/api-surface.md`, and `docs/schema-outline.md` document `staff` as a read-only participant-and-team visibility role, keep non-admin staff and judges distinct, and add `is_staff` as the admin-only parallel to judging participation. `docs/testing-strategy.md` now includes staff in the role-based coverage model and fixture guidance.

Why: the backend, UI, and test subtasks need a stable product model before changing authorization and internal surfaces.

Validation: `bun run lint` completed with 6 pre-existing `vue/no-v-html` warnings; `bun run typecheck` passed; `bun run test:unit` is currently blocked by an unrelated existing failure in `tests/unit/server/utils/hackathon-management.test.ts`; `git diff --check` passed for the touched docs.

Follow-up: `TASK-120.2` must bring the runtime role-assignment model and authorization behavior into alignment with the updated canonical docs.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Test gaps are documented when automation is not practical
- [x] #3 Config and developer workflow docs were updated when setup changed
- [x] #4 Auth and permissions changes follow the documented platform model
- [x] #5 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
