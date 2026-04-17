---
id: TASK-201
title: Simplify the judge assignment review flow in the account hackathon judging tab
status: Done
assignee:
  - codex
created_date: '2026-04-12 18:54'
updated_date: '2026-04-17 18:10'
labels:
  - judging
  - ux
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Reduce the cognitive load of the in-tab judge assignment review experience so judges can review a blind submission, assign criterion scores, and complete the review in a focused single flow without the current competing side panels and excessive metadata.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The judging assignment view in the account hackathon Judging tab presents the review as a focused primary flow centered on the blind submission and criterion scoring.
- [x] #2 Secondary operational details such as timing metadata, skip actions, and ineligibility actions do not compete with the main scoring flow and remain available from the same workspace.
- [x] #3 The judging tab keeps the account hackathon tab shell visible with Judging selected while an assignment is open, including after reload.
- [x] #4 The updated judging review layout and styling align with the existing account hackathon workspace card and header patterns.
- [x] #5 Unit tests and required local validation pass for the judging tab review changes.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Align the blind submission card with the existing account hackathon workspace card pattern instead of a custom judging-specific presentation.
2. Move the project name into the card header title row and place assignment status and eligibility badges beside it.
3. Move the submission summary into the card body with the primary repository and demo actions.
4. Remove judge-irrelevant metadata and secondary panels from the submission card, including the blind-submission label, locked/status text rows, stat boxes, and review context section.
5. Re-run lint, typecheck, unit tests, and a browser spot check on the judging tab assignment view.

6. Replace per-criterion numeric score entry with a judge-friendly 0–10 stepped scoring control that preserves empty/unscored state until the judge acts.

7. Prefer an existing local input pattern if one exists; otherwise implement the smallest native slider-plus-markers control that matches the current rubric card styling.

8. Preserve complete-review validation so a criterion still counts as incomplete until the judge explicitly selects a score.

9. Reveal the blind submission title, remove the low-signal blind-context block, and label the submission description explicitly in the assignment card.

10. Persist blind-review criterion scores progressively with a `PATCH /api/hackathons/:hackathonId/judging/assignments/:assignmentId` route so the first score click can start review and save the selected criterion without reloading the workspace shell.

11. Keep the account hackathon Judging tab visible during background workspace refresh so score-start transitions do not collapse the interface into a loading state.

12. Keep the selected judging workspace mounted while the parent judge queue refreshes so review completion can hide the complete button in place, preserve scroll position, and leave the next-review CTA immediately usable.

13. Collapse the blind submission and rubric surfaces into one card by rendering the rubric inside the blind submission panel below a single divider, instead of stacking a second `Score this submission` card.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Refined scope based on user review feedback: the assignment review shell stays in the Judging tab, but the project card itself should now follow the same header/body hierarchy and information density as the other account workspace cards.

Validation passed after the project-card simplification pass: `bun run lint`, `bun run typecheck`, and `bun run test:unit` all succeeded.

The exact assignment URL now reloads into the existing `Judge access required` guard in the current local browser session, so the latest browser spot check confirmed shell/routing state but not the final rendered project card on that reloaded assignment view.

User approved proceeding with a 0–10 slider-based scoring interaction with visible markers, while keeping criteria unscored until the judge acts.

Replaced per-criterion number entry with a stepped 0–10 slider plus clickable score markers while preserving empty-score state until the judge interacts.

Updated the judge workspace BDD step to use the new marker buttons for score selection.

Validation passed after the slider change: `bun run lint`, `bun run typecheck`, and `bun run test:unit` all succeeded with 406 unit tests passing.

Redesigned each rubric criterion as a full-width scoring block: criterion context first, score lane second, note control last. Removed the narrow right-hand score rail that caused the cramped layout.

The 0–10 control now uses a full-width slider lane, evenly spaced clickable markers, and left/center/right anchor labels (`Weak`, `Solid`, `Exceptional`) to make the scale readable at a glance.

Required validation still passes after the layout redesign: `bun run lint`, `bun run typecheck`, and `bun run test:unit`. Browser-tool visual verification remains limited by the current judge-access guard on that assignment URL after reload.

Replaced the slider-based criterion control with a discrete 0–10 segmented button row, kept the selected score badge in the header row, and made the note textarea always visible.

Tightened each criterion card vertically by removing the extra score container and note toggle so the interaction reads as title, description, score row, anchors, note.

Validation passed after the segmented-score change: `bun run lint`, `bun run typecheck`, and `bun run test:unit` all succeeded with 409 unit tests passing.

Adding a next-review affordance to the assignment action row using the same queue-resolution logic that already drives the judging tab inbox CTA, so the detail view and inbox stay consistent.

Promoting `Skip review` into the main assignment action row for unstarted assignments, while keeping the reason-based skip section in secondary details for in-progress reviews. This matches the canonical rule that assigned reviews can already be skipped before start.

Removed the Review details surface entirely. Skip review now expands inline in the main review card for assigned and in-progress reviews, and the ineligibility reason block also lives directly in that same card.

Updated the judge-workspace BDD step so it opens the inline skip form when needed before filling the reason and confirming the skip.

Validation passed after removing the secondary details panel: `bun run lint`, `bun run typecheck`, and `bun run test:unit` all succeeded with 409 unit tests passing.

Updated the blind review surface to show the submission title, remove the blind-context box, and label the summary as submission description while keeping team identity hidden.

Added in-progress blind score persistence through a new assignment `PATCH` route and reused the same score-writing path for blind-review completion so saved draft scores do not conflict with final submission.

Changed the first blind-score interaction to issue both the review start request and a blind score save request without collapsing the surrounding hackathon judging tab.

Validation passed: `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bun run test:integration -- tests/integration/server/api/judging-routes.test.ts`.

BDD judge-workspace coverage was updated for the new project-title visibility and first-click PATCH request, but the full Playwright BDD suite was not run in this pass.

Kept the selected hackathon judge panel mounted during parent workspace refresh by caching the current hackathon and inbox group only for the active slug while refresh is pending.

This prevents complete-review from tearing down the action row, so the complete button now disappears in place and the next blind-review CTA stays usable without losing scroll position.

Validation passed again after the panel-stability fix: `bun run lint`, `bun run typecheck`, and `bun run test:unit`. Full BDD coverage remains updated in source but was not executed in this pass.

Collapsed the blind submission and scoring surfaces into one card by moving the blind rubric into the blind submission panel below a single divider.

The blind review now reads as one continuous surface: submission details and links first, then the rubric immediately below, without a second `Score this submission` card.

Validation passed after the single-card layout change: `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aligned the blind judge workspace with the current judging model and removed the low-signal review chrome. The blind submission card now shows the submission title, drops the blind-context block, labels the submission description explicitly, and keeps the existing repository, demo, and track details in the primary review surface.

Added progressive blind-score persistence so the first criterion click starts the review and immediately saves the selected score instead of resetting the whole hackathon judging interface. This adds `PATCH /api/hackathons/:hackathonId/judging/assignments/:assignmentId` for in-progress blind-review criterion saves, updates blind-review completion to reuse the same score upsert path, and keeps the account hackathon Judging tab visible during background queue refresh.

Updated canonical docs for in-progress blind score persistence, refreshed unit, integration, and BDD coverage for the new UI and route behavior, and validated with `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bun run test:integration -- tests/integration/server/api/judging-routes.test.ts`. The full Playwright BDD suite was not run in this pass.

Follow-up UX fix: the parent hackathon judging tab now preserves the currently open assignment surface during queue refresh for the same hackathon slug, so completing a review no longer remounts the page. The complete action disappears in place and the next blind-review link remains available at the current scroll position.

Follow-up layout simplification: the blind review now uses one card instead of separate submission and rubric cards. Repository and demo actions sit above a divider, and the evaluation criteria render immediately below in the same surface.
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
