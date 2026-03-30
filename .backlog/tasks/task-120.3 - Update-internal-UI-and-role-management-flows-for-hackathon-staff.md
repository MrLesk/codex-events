---
id: TASK-120.3
title: Update internal UI and role-management flows for hackathon staff
status: Done
assignee:
  - '@codex'
created_date: '2026-03-30 16:55'
updated_date: '2026-03-30 18:01'
labels:
  - frontend
  - ui
  - roles
  - permissions
dependencies:
  - TASK-120.1
  - TASK-120.2
documentation:
  - docs/domain-model.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
parent_task_id: TASK-120
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the internal product surfaces to reflect the canonical `staff` role model. Staff must be able to reach the participant and team visibility surfaces they are allowed to read, without exposing admin actions. Hackathon role-management flows must support assigning staff and the admin-only staff flag consistently with the canonical backend model.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Internal navigation and guarded routes reflect staff access without presenting admin-only actions to staff users.
- [x] #2 Role-management UI supports the canonical staff assignment shape and admin-only staff flag.
- [x] #3 User-facing copy on affected internal screens distinguishes staff visibility from admin authority.
- [x] #4 Frontend behavior and route guards stay aligned with the canonical backend authorization model.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Starting TASK-120.3 after TASK-120.2 backend completion. Next step is a frontend discovery pass to identify internal navigation, guarded routes, role-management forms, and copy that still assume admin-only participant/team visibility.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated the internal account workspace for the canonical staff role model. The hackathon detail page now derives separate `canManage`, `canJudge`, and `canViewParticipantsAndTeams` capabilities from the session actor so staff can reach the participant and team visibility surfaces without being routed through admin navigation or admin-only tabs. The Staff roster now uses the explicit `staff` role plus the admin-only `isStaff` and `isInJudgePool` flags, so admins can independently gain staff visibility or judging while non-admin staff and judges remain separate. Added read-only participant and team visibility panels for staff, kept admin operations/settings surfaces admin-only, and aligned judge/sidebar navigation with judge-enabled admin assignments. Updated frontend utility coverage for tab availability, shell navigation, judging filters, and role-roster behavior. Validation passed with `bun run lint` (existing `vue/no-v-html` warnings only), `bun run typecheck`, `bun run test:unit`, plus focused unit runs for account hackathon tabs, hackathon role roster helpers, shell navigation, and judging workspace filters. The remaining broader actor-matrix automation work is tracked in TASK-120.4.
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
