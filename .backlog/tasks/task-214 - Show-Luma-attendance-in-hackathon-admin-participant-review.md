---
id: TASK-214
title: Show Luma attendance in hackathon admin participant review
status: Done
assignee:
  - Worker C
created_date: '2026-04-13 19:19'
updated_date: '2026-04-13 19:43'
labels: []
dependencies:
  - TASK-212
documentation:
  - app/components/admin/AdminApplicationsReviewPanel.vue
  - app/components/account/hackathons/AccountHackathonAdminOperationsPanel.vue
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Expose participant attendance from Luma check-ins in the existing hackathon admin participant review experience so admins can quickly answer who actually arrived. Keep the first slice minimal and inside the current approved-participants workflow rather than introducing a new admin screen.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The approved participant review view shows whether each approved participant has checked in and shows the check-in timestamp when present.
- [x] #2 The admin operations surface shows a checked-in summary relative to approved participants.
- [x] #3 Admins can filter the approved participant list to checked-in participants only.
- [x] #4 Participants without attendance data remain readable and do not produce confusing empty-state or badge behavior.
- [x] #5 Frontend tests cover the attendance badge, summary, and checked-in filtering behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend the frontend admin application shape in `app/utils/admin-workspace.ts` to include `checkedInAt` and add minimal helpers for attendance presentation and approved-participant attendance summary math.
2. Update `app/components/account/hackathons/AccountHackathonAdminOperationsPanel.vue` to show a checked-in summary relative to approved participants in the existing participants section and pass an explicit flag into the shared review panel so attendance UI stays scoped to the admin workflow.
3. Update `app/components/admin/AdminApplicationsReviewPanel.vue` to surface attendance only in the approved view when enabled: show a `Checked in` badge and timestamp when `checkedInAt` is present, show a neutral `Not checked in` badge otherwise, and add a `Checked in only` toggle that filters approved participants without introducing a new screen.
4. Add the minimum supporting review-group filtering needed so checked-in-only filtering does not leak hidden applicants or teammate hints, keeping the existing grouped approved-participant workflow intact.
5. Add or update frontend tests for attendance helpers, checked-in-only filtering, and the admin approved-participant UI flow, then run `bun run lint`, `bun run typecheck`, and `bun run test:unit` before handoff.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Supervisor assigned worker planning. No code changes approved yet; waiting for plan review.

Local checkout still does not include the TASK-212 backend/schema work for `checkedInAt`, so TASK-214 is being implemented strictly against the approved frontend contract. UI logic and unit coverage can land now, but broader end-to-end coverage remains dependency-bound until the applications payload exposes `checkedInAt`.

Implemented the frontend attendance surface in the existing admin approved-participants workflow only: checked-in summary metric, approved-view `Checked in` / `Not checked in` badges, timestamp chip, and a checked-in-only filter that preserves review grouping rules without leaking hidden teammate hints.

Validation: touched attendance unit tests passed and the full `bun run test:unit` suite passed locally. `bun x eslint` also passed on the TASK-214 files. Repository-wide `bun run lint` is currently blocked by an unrelated quote-props error in `server/utils/luma-webhooks.ts`, and repository-wide `bun run typecheck` is currently blocked by incomplete concurrent backend attendance work outside TASK-214 scope. Canonical docs were left unchanged here because attendance model/API documentation belongs to TASK-211/TASK-212.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented the minimal admin attendance UI inside the existing approved-participants workflow. Extended the frontend admin application shape with `checkedInAt`, added attendance presentation helpers and approved-participant attendance summary math, surfaced a checked-in summary metric in the admin operations panel, and updated the approved participant review view to show `Checked in` / `Not checked in` badges, a check-in timestamp chip, and a `Checked in only` filter. Adjusted review-group filtering so checked-in-only mode does not leak hidden applicants or teammate hints, and kept the UI scoped to the existing approved-participants flow without adding a new screen. Added frontend unit coverage for attendance helpers and checked-in filtering behavior. Validation passed in the integrated repo state with `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bun run test:integration`. Residual risk: this slice depends on the backend `checkedInAt` contract from TASK-212 and intentionally does not add fallback logic for alternate field names.
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
