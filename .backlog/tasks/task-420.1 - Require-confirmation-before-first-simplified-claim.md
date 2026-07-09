---
id: TASK-420.1
title: Require confirmation before first simplified claim
status: Done
assignee:
  - '@codex'
created_date: '2026-07-09 22:22'
updated_date: '2026-07-09 22:36'
labels:
  - frontend
  - bug
dependencies: []
parent_task_id: TASK-420
priority: high
ordinal: 100000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Remove the misleading first-visit form flash from simplified attendee claiming. An authenticated participant who has not claimed yet must see their saved Luma email prefilled and explicitly submit before redemption and external redirection. Existing claims remain idempotent and redirect immediately.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 An unclaimed participant with a saved Luma email sees the editable email field and is not redeemed or redirected until submitting the form
- [x] #2 An unclaimed participant without a saved email or with a roster mismatch can enter or correct the Luma email and retry
- [x] #3 A participant who already owns the event coupon is redirected immediately to the same coupon URL
- [x] #4 Automated tests cover the first-claim confirmation and returning-claim redirect behavior
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Trace the redeem page initialization and its existing participant tests. 2. Remove only the automatic first-claim POST while preserving the idempotent already-claimed redirect. 3. Update black-box tests and any canonical flow wording affected by the behavior change. 4. Run targeted and repository-required validation, then commit and push the isolated fix to main.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implementation slice: removed the automatic first-claim POST and spinner branch, kept the saved Luma email prefilled in the editable confirmation form, preserved immediate redirect for an existing claim, removed the obsolete canAutoRedeem response field, and updated the canonical domain/lifecycle wording. Focused integration validation passed: bun run test:integration -- tests/integration/server/api/simplified-claiming-routes.test.ts (1 file, 9 tests).

Final validation: git diff --check passed; bun run lint passed; bun run typecheck passed; bun run test:unit passed (110 files, 770 tests); bun run test:integration passed (25 files, 358 tests); focused simplified-claiming integration passed (1 file, 9 tests); the authenticated participant BDD scenario passed and covers visible prefilled email, editable mismatch retry, successful claim redirect, returning-account redirect, and admin attendance. The full bun run test:bdd run exposed the unrelated existing Settings-toggle failure: the checkbox unchecks but its QR panel remains mounted. That scenario also fails alone on main-area code and is outside this task; no follow-up task was started without user approval.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
First-time simplified claims now stop on an accessible, editable confirmation form with the saved Luma email prefilled. Redemption begins only after explicit submission; mismatch correction remains available, and existing claims still redirect immediately to the assigned coupon. Removed the obsolete auto-redeem API flag, updated canonical flow documentation, and verified the participant flow end to end.
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
