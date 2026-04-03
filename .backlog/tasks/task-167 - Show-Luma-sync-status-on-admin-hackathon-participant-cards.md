---
id: TASK-167
title: Show Luma sync status on admin hackathon participant cards
status: Done
assignee:
  - codex
created_date: '2026-04-03 05:52'
updated_date: '2026-04-03 05:59'
labels:
  - ui
  - admin
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Surface `lumaSyncStatus` on the participant card in the admin hackathon participants view so admins can see sync outcomes alongside application approval state when the hackathon uses Luma sync. Do not show any Luma indicator when the application has no sync status.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Admin participant cards show the applicant's Luma sync status when `lumaSyncStatus` is present.
- [x] #2 The Luma sync status is visually associated with the participant approval state on the card.
- [x] #3 No Luma sync UI is shown for applications where `lumaSyncStatus` is null or absent.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add Luma sync badge rendering to the existing application status chip row in `app/components/admin/AdminApplicationsReviewPanel.vue`.
2. Add helper functions in `app/utils/admin-workspace.ts` to format Luma sync labels and badge colors from `lumaSyncStatus`.
3. Reuse the shared participant card behavior in both admin and read-only staff participant views because they use the same panel component.
4. Add unit coverage in `tests/unit/app/utils/admin-workspace.test.ts` for the Luma sync label and color mapping.
5. Run `bun run lint`, `bun run typecheck`, and `bun run test:unit` before handoff.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
User approved the shared-card implementation, including showing the same Luma sync badge in the staff read-only participant view because it reuses the same participant card component.

Implemented shared Luma sync badge rendering in the participant card status row and added admin-workspace helper coverage for display gating plus badge label/color mapping.

Validation passed locally with `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added Luma sync state badges to the shared admin participant card row so approved and rejected applications now surface their current sync outcome next to the existing approval-status badge when `lumaSyncStatus` is present. The component now uses admin-workspace helper functions to decide when the badge should render, format the label (`Luma sync pending`, `Luma approved`, `Luma rejected`, and failure variants), and assign badge colors consistently. Submitted applications continue to hide the Luma badge even if a pre-decision sync field exists, which preserves the requested admin behavior.

Updated unit coverage in `tests/unit/app/utils/admin-workspace.test.ts` to verify the new Luma sync label/color mapping and the display guard that suppresses the badge for submitted applications or null sync state. No canonical docs or config changes were needed. Local validation passed with `bun run lint`, `bun run typecheck`, and `bun run test:unit`.

Scope note: because the admin and staff participant tabs share the same `AdminApplicationsReviewPanel` card component, the same Luma sync badge now appears in the read-only staff participant view as well.
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
