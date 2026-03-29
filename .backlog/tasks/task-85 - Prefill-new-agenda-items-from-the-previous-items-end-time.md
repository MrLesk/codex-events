---
id: TASK-85
title: Prefill new agenda items from the previous item's end time
status: Done
assignee: []
created_date: '2026-03-29 16:20'
updated_date: '2026-03-29 16:21'
labels:
  - ui
  - admin
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the shared agenda editor so when a new agenda item is added after an existing item with an `endsAt` value, the new item defaults both `startsAt` and `endsAt` to that previous `endsAt`. If no previous item exists or it has no `endsAt`, keep the new item time fields blank.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Adding a new agenda item after an item with an `endsAt` value sets the new item's `startsAt` to that previous `endsAt`.
- [x] #2 In the same case, the new item's `endsAt` is also set to that previous `endsAt`.
- [x] #3 Adding the first agenda item, or adding after an item without `endsAt`, leaves the new item's `startsAt` and `endsAt` blank.
- [x] #4 Validation passes and any lack of focused automated UI coverage is documented if no practical test exists.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Confirmed canonical docs remain unchanged for this shared agenda-editor defaulting rule.

Extracted the new-item default time rule into a small pure helper in admin-workspace so the behavior is explicit and unit tested.

Implemented the requested behavior as: when the previous agenda item has a non-empty `endsAt`, the next new item's `startsAt` and `endsAt` both default to that value; otherwise both remain blank.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated the shared agenda editor so adding a new agenda item now prefills both `startsAt` and `endsAt` from the previous item's `endsAt` when that value exists. If there is no previous item, or the previous item has no `endsAt`, both new fields remain blank. The behavior is implemented through a small helper in `admin-workspace` and used by the shared `HackathonConfigForm` add-item path.

Added focused unit coverage for the default-time helper and validated the full repo checks. Validation passed with `bunx vitest run tests/unit/app/utils/admin-workspace.test.ts`, `bun run typecheck`, `bun run test:unit`, and `bun run lint` (lint still reports the pre-existing `vue/no-v-html` warnings in the legal/static pages).
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
