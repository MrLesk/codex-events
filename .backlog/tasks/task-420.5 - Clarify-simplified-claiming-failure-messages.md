---
id: TASK-420.5
title: Clarify simplified claiming failure messages
status: Done
assignee:
  - '@codex'
created_date: '2026-07-15 21:00'
updated_date: '2026-07-15 21:06'
labels: []
dependencies: []
parent_task_id: TASK-420
priority: medium
type: bug
ordinal: 104000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Give event participants a specific closed-redemption message instead of the generic unavailable state, and simplify the unmatched Luma email message. Keep private setup failures non-specific.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A participant opening a configured simplified claim after its registration window receives a distinct closed state and sees ‘Redemption has closed’.
- [x] #2 Incomplete or disabled simplified claiming continues to return the non-sensitive unavailable state.
- [x] #3 An unmatched submitted email displays exactly ‘That email was not found on the Luma attendee list.’
- [x] #4 API, integration, and Auth0-backed browser coverage verify the new participant-facing states and copy.
<!-- AC:END -->

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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend the participant simplified-claim state contract with a distinct closed state after readiness succeeds but the registration window is not open.
2. Render a participant-facing closed alert in the existing redemption page and update the unmatched-email API copy.
3. Add an isolated closed simplified-claiming BDD fixture and assertions, update integration expectations and canonical API documentation.
4. Run all required validation, finalize the task, and commit/push the isolated change to main.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Actor: an authenticated event participant who scanned the private QR. Goal: understand whether claiming has ended or whether their entered Luma email is absent. Audience copy should name those outcomes and omit setup internals. Component map: the existing GET route owns the non-sensitive state contract; app/pages/events/[slug]/redeem.vue remains the single route-level presenter using existing AppAlert branches; the redeem action owns the unmatched-email message. No new Vue component or composable is justified for two bounded states.

Implementation slice: Added a distinct `closed` GET state only after simplified claiming is otherwise ready and the registration window has ended or the Meetup is completed. The existing redemption page renders “Redemption has closed” with “Coupons can no longer be claimed for this event.” Disabled, incomplete, and not-yet-open setup remains unavailable. Updated the unmatched-email API message exactly as requested.

Test slice: Added integration assertions for unavailable versus closed and exact unmatched-email copy. Added an isolated ready-but-closed BDD Meetup fixture and participant scenario that asserts the rendered closed title and description. Targeted simplified-claiming integration suite passed (1 file, 9 tests).

Final validation: `bun run lint` passed; `bun run typecheck` passed; `bun run test:unit` passed (110 files, 771 tests); `bun run test:integration` passed (25 files, 360 tests); `bun run test:bdd` passed (51 regular/authenticated scenarios and 2 destructive scenarios), including the exact mismatch message and closed-redemption UI. `git diff --check` passed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a distinct closed simplified-claim state and clear participant copy while keeping incomplete setup private. Simplified the unmatched Luma email message exactly as requested. Updated canonical docs and verified the API and rendered Auth0-backed flow across all required suites. No setup changes, known risks, or follow-ups remain.
<!-- SECTION:FINAL_SUMMARY:END -->
