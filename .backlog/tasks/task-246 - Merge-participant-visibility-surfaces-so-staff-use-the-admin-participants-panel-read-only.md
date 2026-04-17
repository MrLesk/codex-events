---
id: TASK-246
title: >-
  Merge participant visibility surfaces so staff use the admin participants
  panel read-only
status: Done
assignee: []
created_date: '2026-04-17 15:47'
updated_date: '2026-04-17 15:54'
labels:
  - ui
  - participants
  - staff
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/permissions-matrix.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the separate staff participant-visibility surface with the same Participants panel used by hackathon admins, while keeping staff read-only. This removes duplicated participant UI and prevents participant-only changes such as attendance and summary cards from drifting between two different components.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The account hackathon Participants tab uses a single shared participant surface for both hackathon admins and staff/platform actors with participant visibility access.
- [x] #2 Hackathon admins retain participant mutation actions, while staff can review the same participant data and attendance details without edit controls.
- [x] #3 The merged participant surface shows the same participant summary cards and filters for staff and admins, subject only to capability-based edit restrictions.
- [x] #4 The separate participant visibility component is removed or reduced so participant presentation logic is no longer duplicated across two components.
- [x] #5 Unit coverage is updated for the merged participant access and rendering behavior, and required repo validation passes.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Move the duplicated participant summary and filter UI into a shared participants panel component.
2. Render that shared panel from the admin participants section and the staff visibility path, with read-only behavior controlled by props.
3. Keep staff on the lightweight applications fetch path while preserving the same attendance and participant summary presentation.
4. Add unit coverage for the extracted participant summary helpers and rerun required validation.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Extracted a shared AccountHackathonParticipantsPanel component so participant summary cards, filters, attendance UI, and review-panel wiring live in one place for both admin and staff flows.

Kept AccountHackathonAdminOperationsPanel admin-only for submissions and operations; the staff path now reuses the shared participants panel through the lightweight AccountHackathonParticipantVisibilityPanel data wrapper instead of the admin workspace composable, which avoids mounting unrelated admin-only data fetches.

Added utility coverage for participant status summaries and approved/total registration formatting in tests/unit/app/utils/admin-workspace.test.ts. Validation passed with bun run lint, bun run typecheck, and bun run test:unit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Replaced the duplicated participant presentation with a shared AccountHackathonParticipantsPanel component that now owns the participant summary cards, status pills, checked-in visibility, and AdminApplicationsReviewPanel wiring. The admin operations panel delegates its Participants section to this shared component, while the staff-only AccountHackathonParticipantVisibilityPanel was reduced to a lightweight data wrapper that passes applications, hackathon attendance configuration, and read-only state into the same shared surface.

This keeps staff on the existing lightweight participant-visibility fetch path instead of routing them through the full admin operations workspace, while still giving staff the same participant summaries, checked-in filtering, and withdrawn view that admins see, minus edit controls.

Tests and validation:
- Added unit coverage for participant status summary helpers and approved/total registration formatting in tests/unit/app/utils/admin-workspace.test.ts
- bun run lint
- bun run typecheck
- bun run test:unit
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
