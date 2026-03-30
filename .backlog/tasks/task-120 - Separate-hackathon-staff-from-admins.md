---
id: TASK-120
title: Separate hackathon staff from admins
status: Done
assignee: []
created_date: '2026-03-30 16:55'
updated_date: '2026-03-30 18:05'
labels:
  - roles
  - permissions
  - hackathon
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
  - docs/schema-outline.md
  - docs/testing-strategy.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Introduce a separate hackathon-scoped `staff` capability in the canonical product model. Staff can see all participants and teams for a hackathon but cannot perform admin operations. Non-admin `staff` and `judge` remain distinct roles. `hackathon_admin` remains the only role that can combine with judging participation and staff visibility through separate flags. Platform admin behavior remains unchanged unless required by the canonical docs updated in this initiative.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The canonical product model defines a hackathon-scoped `staff` capability separate from `hackathon_admin` and `judge`.
- [x] #2 Staff can read participant and team data for a hackathon without gaining admin operations.
- [x] #3 Non-admin staff and judges remain distinct; only hackathon admins can additionally participate in judging and/or staff visibility through separate flags.
- [x] #4 Documentation, backend behavior, UI access, and tests are updated consistently to the new canonical role model.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Canonical role decision from user review: `staff` is hackathon-scoped only. Staff can see participants and teams but cannot perform admin operations. Non-admin staff and judges remain distinct. Hackathon admins do not automatically become judges or staff; instead, judging participation continues to use a separate admin-capable flag pattern, and staff visibility should gain a parallel admin-only flag. Staff do not judge, judges are not staff, and only admins may additionally carry those extra capabilities.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed the end-to-end separation of hackathon staff from admins. Canonical docs now define `staff` as a hackathon-scoped read-only internal role for participant and team visibility, distinct from `hackathon_admin`, while admin judging and staff visibility remain independent capability flags on admin assignments. Backend schema, validation, authorization, and API handlers now enforce the canonical combinations and keep blind-review access separate from admin operational access. The internal account workspace now exposes staff participant/team visibility without admin navigation or admin-only actions, and the role roster UI now manages explicit staff assignments plus the admin-only `isStaff` and `isInJudgePool` flags correctly. Automated coverage was updated across backend unit/integration tests and frontend unit tests, with the remaining practical gap documented: a dedicated Auth0-backed BDD staff persona/browser flow is still not provisioned by the current BDD bootstrap support, so staff browser coverage continues to rely on the unit and integration layers.
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
