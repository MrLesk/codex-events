---
id: TASK-413
title: Allow event staff to claim event credits
status: Done
assignee:
  - '@Codex'
created_date: '2026-06-18 16:46'
updated_date: '2026-06-18 16:52'
labels:
  - backend
  - frontend
  - docs
dependencies: []
priority: medium
ordinal: 92000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Event staff should be able to claim one participant-facing credit value from each event credit offer without registering as participants. Staff access should not grant admin credit inventory visibility or credit management.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Staff-only event role members see the Credits tab when event credit inventory exists.
- [x] #2 Staff-only event role members can list participant-facing credit offers and claim at most one value per offer.
- [x] #3 Staff-only event role members cannot view admin credit inventory or manage credit offers unless they also have admin access.
- [x] #4 Approved participant and event admin credit behavior remains unchanged.
- [x] #5 Canonical docs describe staff credit claiming without treating staff as participants.
- [x] #6 Unit and integration tests cover staff tab visibility and staff-only claim access.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update canonical credit permissions/docs to include staff claiming without admin inventory access.
2. Extend server credit view and claim authorization to allow event staff in addition to approved participants and admins.
3. Update account workspace tab and panel inputs so staff-only users can see and claim credits when inventory exists.
4. Add focused unit/integration coverage for staff-only visibility, claim access, and admin inventory denial.
5. Run required validation and finalize the task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented staff credit claiming by extending participant-visible credit view/claim access to event staff while keeping admin inventory and management routes admin-only. Account workspace tab visibility now shows Credits to staff only when uploaded inventory exists. Validation passed: focused account workspace unit test, focused event credit integration test, bun run lint, bun run typecheck, bun run test:unit, bun run test:integration, bun run test:bdd, and git diff --check.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Event staff can now see and claim participant-facing event credits without registering as participants. Each staff user is still limited to one claimed value per credit offer by the existing claimed_by_user_id uniqueness model, and staff do not gain admin inventory or credit-management access. Canonical docs and focused unit/integration coverage were updated; full validation passed.
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
