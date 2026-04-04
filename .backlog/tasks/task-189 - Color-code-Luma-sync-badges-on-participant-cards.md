---
id: TASK-189
title: Color-code Luma sync badges on participant cards
status: Done
assignee:
  - '@codex'
created_date: '2026-04-04 13:32'
updated_date: '2026-04-04 13:33'
labels:
  - ui
  - admin
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the shared admin participant card Luma sync badge treatment so approved sync states read as success, rejected sync states read as error, and pending/manual-attention sync states remain warning. This applies to both the admin review view and the read-only participant directory because they share the same card component.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Approved participant cards render `Luma approved` with the success badge color.
- [x] #2 Rejected participant cards render `Luma rejected` with the error badge color.
- [x] #3 Pending or attention-needed Luma sync states continue to render with the warning badge color.
- [x] #4 Shared helper and unit coverage reflect the updated Luma sync badge color mapping.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update `getApplicationLumaSyncStatusColor` in `app/utils/admin-workspace.ts` so `approve_synced` maps to `success`, `reject_synced` maps to `error`, and pending or failed sync states stay `warning`.
2. Keep the shared badge rendering in `app/components/admin/AdminApplicationsReviewPanel.vue` unchanged unless discovery shows an additional visual dependency.
3. Update `tests/unit/app/utils/admin-workspace.test.ts` to cover the new color mapping while preserving the existing visibility rules.
4. Run targeted unit coverage, then `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Updated the shared Luma sync badge color mapping in `app/utils/admin-workspace.ts` so approved sync states use the success badge color and rejected sync states use the error badge color. The shared participant card component in `app/components/admin/AdminApplicationsReviewPanel.vue` already consumed this helper, so no component template change was required. Expanded unit coverage in `tests/unit/app/utils/admin-workspace.test.ts` to assert pending, approved, rejected, and failed color mappings.

Validation passed locally with `bun x vitest run tests/unit/app/utils/admin-workspace.test.ts`, `bun run lint`, `bun run typecheck`, and `bun run test:unit`.

Canonical docs unchanged; this was a shared UI semantics update only.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Remapped the shared Luma sync badge colors so `Luma approved` now renders with the success treatment, `Luma rejected` renders with the error treatment, and pending or failed sync states remain warning. Because the admin review panel and the read-only participant directory both use the same helper-driven badge rendering, the updated colors apply consistently in both places.

Updated unit coverage to assert the new badge color semantics for pending, approved, rejected, and failed Luma sync states. No canonical docs or config changes were required, and local validation passed with the targeted unit test plus `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
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
