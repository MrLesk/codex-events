---
id: TASK-262
title: Align pitch review workspace with the simplified blind review experience
status: Done
assignee:
  - codex
created_date: '2026-04-17 20:11'
updated_date: '2026-04-17 20:23'
labels:
  - judge-workspace
  - frontend
  - ux
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Bring the judge-facing pitch review assignment workspace up to the same integrated UX standard as the blind review workspace so judges can review a finalist, understand progress, score the pitch, and move through actions in one coherent surface instead of the older multi-card layout.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Pitch review assignments use the same single primary workflow surface pattern as blind review instead of separate submission, progress, and scoring cards
- [x] #2 Pitch review keeps its stage-specific behavior and copy while presenting score entry, review progress, and available actions in the integrated workflow section
- [x] #3 Pitch review links, track context, and submission details still render correctly inside the updated layout
- [x] #4 Relevant docs or tests are updated to reflect the new judge workspace structure where needed
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend `app/components/judging/PitchSubmissionPanel.vue` to match the blind-review card structure by supporting slotted workflow content beneath the finalist details.
2. Refactor the pitch-review branch in `app/components/judging/JudgeAssignmentWorkspacePanel.vue` so review progress, alerts, actions, skip/ineligibility controls, and score entry live inside the primary pitch submission card instead of separate cards.
3. Keep pitch-specific semantics intact while tightening stage-aware copy inside the integrated flow, including explicit start-review behavior and pitch-focused labels for gated states.
4. Update relevant tests only where behavior or copy assertions change, then run `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Context discovery: blind review already uses a single integrated assignment card with slotted workflow content; pitch review still splits submission details, review progress, and scoring into separate cards. Pending user approval, preserve pitch-specific start/submit semantics while aligning the layout and information hierarchy to the blind workspace.

2026-04-17: Refactored the judge-facing pitch review workspace into the same integrated single-card flow used by blind review. `PitchSubmissionPanel.vue` now supports slotted workflow content and presents finalist metadata with a side-column team/track treatment instead of the older split header copy.

2026-04-17: Moved pitch score entry, review progress, actions, alerts, and skip controls into the primary pitch submission card inside `JudgeAssignmentWorkspacePanel.vue`, preserving explicit pitch start/submit behavior while removing the old separate progress and scoring cards.

2026-04-17: Canonical docs remain unchanged because this is a judge-workspace presentation refactor, not a lifecycle or data-model change.

2026-04-17: Validation passed locally with `bun run lint`, `bun run typecheck`, and `bun run test:unit`. No dedicated component-level UI automation was added because this area does not currently have a Vue component test harness; the gap is limited to presentational workflow structure rather than domain behavior.

2026-04-17: Reopened for a follow-up interaction fix after layout alignment. The pitch workspace still retained the old explicit start gate, leaving the score and comment inputs locked on `assigned` pitch assignments. The follow-up will remove the standalone pitch start button and mirror blind-review auto-start semantics from score interaction.

2026-04-17: Follow-up interaction fix completed. Pitch review now mirrors the blind workspace start model: there is no standalone pitch start button, score selection auto-starts the assignment when it is still `assigned`, and the pitch score/comment controls are no longer locked behind a separate explicit start action.

2026-04-17: Added unit coverage for the new pitch auto-start guard in `tests/unit/app/utils/judging-workspace.test.ts` and reran the required local validation commands.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Pitch review now uses the same integrated workflow surface as blind review, and the interaction model is aligned too. The judge-facing workspace no longer splits finalist details, progress, and scoring across three cards. `PitchSubmissionPanel.vue` exposes a slotted workflow area, and `JudgeAssignmentWorkspacePanel.vue` renders the pitch score controls, optional comment, review-progress status, actions, alerts, and skip flow directly inside that primary finalist card.

The follow-up interaction fix removes the leftover explicit pitch-start step that survived the layout refactor. Judges no longer see a standalone `Start pitch review` button. Instead, the pitch assignment now auto-starts from the first score interaction, matching the simplified blind-review workflow, and the pitch score/comment controls are no longer visually locked behind a separate start action.

Finalist details were also tightened to better match the blind-review treatment. The project summary remains the main content, while team name and optional track metadata sit in a concise right-side column. Repository and demo links continue to render as before.

Canonical docs remain unchanged because no product rule or lifecycle behavior changed. Validation passed locally with `bun run lint`, `bun run typecheck`, and `bun run test:unit`. Unit coverage now includes the pitch auto-start guard in `tests/unit/app/utils/judging-workspace.test.ts`. There is still no dedicated Vue component test harness in this area, so the remaining automation gap is limited to layout-level browser regression coverage.
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
