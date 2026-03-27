---
id: TASK-51
title: 'Add manual ordering for agenda, criteria, and prizes in admin'
status: Done
assignee: []
created_date: '2026-03-27 22:25'
updated_date: '2026-03-27 22:26'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Allow hackathon admins to manually reorder ordered content using drag-and-drop controls, with explicit persistence so displayed order matches admin intent across admin and public surfaces.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Hackathon agenda items can be reordered in the config form via drag and drop (with move controls) and displayOrder is normalized from that order when saving configuration.
- [x] #2 Evaluation criteria and prizes can be reordered in the hackathon admin settings UI via drag and drop (with move controls) and expose explicit save-order actions.
- [x] #3 Prize definitions persist displayOrder in storage and admin/public prize list endpoints return prizes ordered by displayOrder with stable fallback ordering.
- [x] #4 Downstream prize-related views that depend on prize ordering use displayOrder-first ordering where applicable.
- [x] #5 Validation succeeds for this change set using bun run typecheck and bun run test:unit.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add displayOrder persistence and ordering for prizes in schema, serializers, and APIs.
2. Add drag-and-drop/manual move reordering for agenda items in HackathonConfigForm with normalized displayOrder.
3. Add drag-and-drop/manual move reordering for criteria and prizes in admin settings with explicit save-order actions.
4. Update downstream prize consumers to use displayOrder-first ordering.
5. Validate with typecheck, lint, and unit tests.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented two-phase criterion order persistence to avoid temporary displayOrder uniqueness conflicts while reordering evaluation criteria. Added explicit save-order actions for criteria and prizes so ordering changes are persisted intentionally. Kept existing lint warnings related to trusted v-html usage unchanged.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented manual ordering across admin-ordered lists with backend persistence and drag/drop UX improvements.

Scope delivered:
- Added `prizes.display_order` to schema and migration, and extended prize serializers/types to include `displayOrder`.
- Updated prize read APIs (admin and public) to return displayOrder-first ordering with stable rank/createdAt fallback.
- Updated prize creation API to auto-append displayOrder when omitted.
- Updated downstream prize ordering in shortlist winner mapping and prize-redemptions listing to displayOrder-first.
- Added drag-and-drop plus move up/down controls for agenda items in `HackathonConfigForm`, with displayOrder normalization after reorder/remove.
- Added drag-and-drop plus move up/down controls for criteria and prizes in admin settings, including explicit save-order actions.
- Added criterion-order persistence logic using temporary high displayOrder values first, then final values, to avoid unique displayOrder conflicts.
- Included `displayOrder` in full prize update payloads so prize edits preserve order state.
- Updated schema unit tests to assert the new `prizes.display_order` column/check coverage.

Validation:
- `bun run typecheck` passed.
- `bun run test:unit` passed.
- `bun run lint` passed with existing repository warnings only (`vue/no-v-html` in pre-existing files).

Risks/follow-ups:
- Drag-and-drop behavior is validated through type/unit/lint; no browser automation was added in this change set.
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
