---
id: TASK-207
title: Align account hackathon Teams tab visibility for staff and admins
status: Done
assignee:
  - codex
created_date: '2026-04-13 15:44'
updated_date: '2026-04-13 16:11'
labels:
  - ui
  - authorization
dependencies: []
documentation:
  - docs/permissions-matrix.md
  - docs/api-surface.md
  - docs/domain-model.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the account-scoped hackathon Teams tab so hackathon staff and hackathon admins can always see the hackathon team directory there. Team-join actions in that tab should remain participant-only, so staff or admins without participant access can browse teams but cannot request to join them.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Hackathon staff can open the Teams tab and browse the full hackathon team directory without participant-only join actions when they are not participants.
- [x] #2 Hackathon admins can open the Teams tab and browse the full hackathon team directory even when they do not have participant access.
- [x] #3 Actors who are both staff or admins and approved participants still retain the participant join-request experience in the Teams tab.
- [x] #4 Automated coverage verifies the Teams tab access rules and the join-action gating for participant and non-participant staff or admin actors.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update account hackathon tab access so hackathon admins receive the Teams tab even without participant access.
2. Render the Teams tab with the participant team panel for actors who can view hackathon teams, so participant-capable staff/admins keep join-request behavior while non-participants stay read-only through existing join-availability checks.
3. Keep canonical docs unchanged unless implementation reveals a mismatch.
4. Add automated coverage for admin/staff teams-tab access and participant-only join CTA visibility.
5. Validate with targeted tests, then bun run lint, bun run typecheck, and bun run test:unit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented Teams-tab access for admins without participant access and routed the Teams tab through the participant team panel for participant-capable staff/admin actors.

Added unit coverage for admin Teams-tab access and non-approved join-request gating.

Added authenticated BDD coverage for a non-participant hackathon admin Teams-tab browse flow and a participant-capable admin join-request flow.

Validation results: `bun run typecheck` passed, `bun run test:unit` passed, targeted authenticated BDD grep run passed, targeted ESLint on touched files passed.

`bun run lint` still fails because of unrelated existing issues in `server/utils/applications.ts` (`consistent-type-imports` and unused `AdminApplicationWithdrawalPlan`).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated the account hackathon Teams tab so hackathon admins can access it even without participant access, and so the tab reuses the participant team panel for participant-capable staff and admins. This keeps the full team directory visible to internal actors while preserving participant-only join actions through the existing join-availability checks.

Added regression coverage for the tab-access rules and join gating in unit tests, plus authenticated BDD scenarios covering a non-participant hackathon admin browsing the Teams tab and a participant-capable admin still seeing the join CTA in the selected team view.

Validation: `bun run typecheck` passed, `bun run test:unit` passed, targeted authenticated BDD scenarios passed, and targeted ESLint on touched files passed. `bun run lint` still fails because of unrelated existing issues in `server/utils/applications.ts` (type-only import linting and an unused type).
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [ ] #3 Relevant validation commands pass
- [x] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [x] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
