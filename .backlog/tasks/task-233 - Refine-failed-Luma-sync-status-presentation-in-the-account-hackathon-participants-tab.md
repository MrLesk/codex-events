---
id: TASK-233
title: >-
  Refine failed Luma sync status presentation in the account hackathon
  participants tab
status: Done
assignee:
  - '@codex'
created_date: '2026-04-17 09:55'
updated_date: '2026-04-17 13:12'
labels:
  - admin
  - frontend
  - ux
  - luma
dependencies: []
documentation:
  - docs/domain-model.md
  - app/components/admin/AdminApplicationsReviewPanel.vue
  - app/utils/admin-workspace.ts
  - tests/unit/app/utils/admin-workspace.test.ts
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Polish the failed Luma sync recap inside the account-scoped hackathon participants workspace so hackathon admins can scan the warning quickly when collapsed and review affected participants in a clean table when expanded. Keep the underlying failed-sync filtering and warning copy behavior unchanged across approved, rejected, and withdrawn participant views.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The failed Luma sync alert keeps the current warning title and description but shows a right-aligned expand or collapse control instead of repeating the participant count inline below the description.
- [x] #2 When expanded, the alert shows affected participants in a compact table layout that is readable on both desktop and mobile and presents the participant identity alongside the relevant Luma or account email detail.
- [x] #3 The collapse state uses clear expand or collapse labeling with matching chevrons and preserves the existing failed-sync filtering behavior for approved rejected and withdrawn review views.
- [x] #4 Automated coverage is updated for any changed UI-label helper behavior and canonical docs are confirmed unchanged because this task only refines presentation.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the failed Luma sync alert layout in `app/components/admin/AdminApplicationsReviewPanel.vue` so the warning summary keeps the current copy while the expand or collapse control sits on the right side of the recap instead of below it.
2. Replace the expanded free-form participant list with a compact two-column table that shows participant identity and the relevant Luma or account email detail, using existing workspace table spacing patterns and a mobile-friendly stacked fallback.
3. Simplify the toggle helper in `app/utils/admin-workspace.ts` to return clear expand or collapse labels and update `tests/unit/app/utils/admin-workspace.test.ts` to cover the new labels before running lint typecheck and unit tests.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
L1 micro-brief: closest local patterns are `app/components/admin/AdminSubmissionInterventionsPanel.vue` for the expandable warning pattern and `app/components/account/hackathons/AccountHackathonCreditsPanel.vue` for the compact responsive table treatment. Main risk is preserving good mobile readability without introducing an extra nested card inside the existing warning surface.

Updated the failed Luma sync recap in `app/components/admin/AdminApplicationsReviewPanel.vue` to render a custom warning summary row with a right-aligned button-style expand or collapse control and an expanded two-column table for affected participants.

Kept the failed-sync filtering behavior unchanged and simplified `formatFailedApplicationLumaSyncAlertToggleLabel` to the new `Expand` / `Collapse` labels covered by the existing unit helper test.

Confirmed canonical docs remain unchanged for this presentation-only refinement. Validation passed with `bun run lint`, `bun run typecheck`, and `bun run test:unit`. No authenticated browser visual pass was run in this session, so the remaining risk is limited to runtime spacing and responsive presentation.

Follow-up: hid the admin participants-tab `Checked in` summary card unless the hackathon both requires a Luma email and has a configured `lumaEventApiId`, matching when attendance sync can actually populate `checkedInAt`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Refined the failed Luma sync warning in the account hackathon participants tab so admins now see the existing warning copy with a right-aligned button-style `Expand` / `Collapse` toggle instead of a repeated participant-count label. When expanded, the warning now presents affected participants in a compact two-column table that separates participant identity from the relevant Luma or account email detail, which makes long names and emails substantially easier to scan.

I also hid the admin `Checked in` participant summary card unless the hackathon both requires a Luma email and has a configured `lumaEventApiId`, so the attendance metric appears only when Luma attendance sync can actually populate `checkedInAt`.

The underlying failed-sync filtering logic for approved, rejected, and withdrawn views was left unchanged. I updated the shared toggle-label helper, added a shared attendance-summary visibility helper, and adjusted unit coverage accordingly. Canonical docs were confirmed unchanged because the task refines admin participants-tab presentation and gating.

Validation run locally:
- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`

Residual risk: I did not run an authenticated browser visual pass in this session, so any remaining risk is limited to runtime spacing or responsive presentation details inside the warning alert and participants metrics grid.
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
