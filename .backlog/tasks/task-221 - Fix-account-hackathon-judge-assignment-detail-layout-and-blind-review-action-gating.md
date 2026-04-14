---
id: TASK-221
title: >-
  Fix account hackathon judge assignment detail layout and blind-review action
  gating
status: Done
assignee: []
created_date: '2026-04-14 20:16'
updated_date: '2026-04-14 20:28'
labels:
  - bugfix
  - judging
  - ui
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the account hackathon judging assignment detail workspace so it keeps the same content width as the judging tab, keeps blind-review progress and actions inline near the bottom completion controls, and explains when blind-review actions are unavailable because the hackathon is not in the blind-review state. Blind review should start from the judge's first criterion score interaction instead of a separate start button, and action failures should use the canonical API error message returned by the server.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The judging assignment detail view in `/account/hackathons/:slug?tab=judging&assignment=...` keeps the same effective content width as the surrounding judging tab instead of shrinking to a narrower container.
- [x] #2 For blind-review assignments, the scoring rubric appears before the review progress/actions card so skip and complete actions stay at the bottom of the workflow.
- [x] #3 Blind-review assignments no longer show a separate start button; the first criterion score interaction starts the review and preserves that first score selection.
- [x] #4 When a blind-review assignment is viewed outside the `blind_review` hackathon state, blind-review score-start and skip interactions are visibly unavailable and the UI explains why inline.
- [x] #5 Relevant automated tests are updated for the new blind-review auto-start behavior and gating/error handling.
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

Follow-up adjustment: restore the blind-review progress card to the bottom of the page, remove the explicit blind-review start button, and auto-start the blind review from the first criterion score interaction while keeping skip/complete actions in the bottom card.

Adjusted the same task after review feedback: the blind-review progress/actions card now sits below the rubric again, the explicit blind start button was removed, and the first criterion score now triggers the start endpoint while preserving the chosen score locally.

Updated the authenticated judge-workspace BDD step to start blind review through the first criterion score interaction so the test flow matches the revised UI.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated the account hackathon judge assignment detail workspace to keep its full tab width, restore the blind-review progress/actions card to the bottom of the page, and keep blind-review feedback local to that card instead of showing a page-level banner. Blind-review assignments no longer expose a separate start button; the first criterion score now triggers the start endpoint, keeps that selected score in the local rubric state, and leaves completion at the bottom of the workflow. Pitch-review behavior remains unchanged.

Refined the shared judging utilities and rubric component to support the blind-review auto-start gate and added unit coverage for the new auto-start eligibility helper alongside the existing gating/error normalization checks. Updated the authenticated judge-workspace BDD step so it starts blind review through the first criterion score interaction.

Validation run:
- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`

Risks/follow-up:
- No canonical docs changes were required.
- The first blind-review score is still local until the judge submits the completed review, which matches the existing completion contract.
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
