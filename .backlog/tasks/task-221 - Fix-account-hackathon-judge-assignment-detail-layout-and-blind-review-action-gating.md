---
id: TASK-221
title: >-
  Fix account hackathon judge assignment detail layout and blind-review action
  gating
status: Done
assignee: []
created_date: '2026-04-14 20:16'
updated_date: '2026-04-14 20:21'
labels:
  - bugfix
  - judging
  - ui
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the account hackathon judging assignment detail workspace so it keeps the same content width as the judging tab, places blind-review progress actions before the scoring form, and explains when blind-review actions are unavailable because the hackathon is not in the blind-review state. Action failures for start/skip blind review should appear inline near the affected controls and use the canonical API error message returned by the server.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The judging assignment detail view in `/account/hackathons/:slug?tab=judging&assignment=...` keeps the same effective content width as the surrounding judging tab instead of shrinking to a narrower container.
- [x] #2 For blind-review assignments, the review progress card with start and skip actions appears above the scoring form.
- [x] #3 When a blind-review assignment is viewed outside the `blind_review` hackathon state, start and skip controls are visibly unavailable and the UI explains that these actions require the hackathon to be in blind review.
- [x] #4 If the user attempts a blind-review start or skip action and the server returns a canonical API error, the inline action area shows the server message next to the relevant controls instead of relying on a page-level banner.
- [x] #5 Relevant automated tests cover the new blind-review gating and inline error behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Review the account hackathon judging detail workspace and existing judging utility patterns for layout, action gating, and API error handling.
2. Update the blind-review detail layout so review progress actions stay above scoring, keep the page width aligned with the parent judging tab, and surface action availability/error messages inline.
3. Add focused unit coverage for blind-review action gating and canonical server-message handling, then run the required repo validation commands.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Confirmed canonical docs unchanged: lifecycle and permissions already require judges to start and skip blind assignments only during `blind_review`.

Implemented the fix in the judge assignment detail workspace and shared judging utility, then validated with `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated the account hackathon judge assignment detail workspace to keep its full tab width, move the blind-review progress/actions card above the scoring rubric, and keep blind-review start/skip feedback local to that card instead of showing a page-level banner. Added shared judging helpers to disable blind-review actions until the hackathon reaches `blind_review` and to prefer canonical API error messages from the server when an action request fails.

Added unit coverage for the new blind-review action gating and judge-action error normalization in `tests/unit/app/utils/judging-workspace.test.ts`.

Validation run:
- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`

Risks/follow-up:
- No canonical docs changes were required.
- Pitch-review layout and behavior were left unchanged aside from sharing the updated inline action feedback placement pattern.
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
