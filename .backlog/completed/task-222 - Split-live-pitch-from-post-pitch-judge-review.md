---
id: TASK-222
title: Split live pitch from post-pitch judge review
status: Done
assignee:
  - '@codex'
created_date: '2026-04-14 20:37'
updated_date: '2026-04-14 20:55'
labels:
  - judging
  - lifecycle
  - ux
  - docs
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/api-surface.md
  - docs/schema-outline.md
  - docs/permissions-matrix.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Clarify the hackathon judging lifecycle so finalist teams have an explicit live pitch stage before judges receive post-pitch scored review assignments. The current canonical model and implementation collapse those moments into `pitch_review`, which makes it unclear when teams are supposed to pitch and when judges are expected to review. The updated model should preserve manual admin control from the account hackathon operations flow while separating the live presentation phase from the final scored review phase.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Canonical docs define a dedicated `pitch` lifecycle state before `pitch_review`, and `pitch_review` remains the post-pitch scored review stage.
- [x] #2 Starting the live `pitch` stage does not create pitch judge assignments; pitch assignments are created only when admins explicitly start `pitch_review` after the pitch stage ends.
- [x] #3 Admin, participant, and judge-facing state presentation clearly distinguishes the live pitch phase from the post-pitch review phase.
- [x] #4 Relevant tests and required local validation cover the updated lifecycle behavior and presentation changes.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the canonical docs to insert a live `pitch` state before `pitch_review`, and define `pitch_review` as the post-pitch scored review stage.
2. Propagate the new state through shared enums and presentation helpers so the admin workspace shows separate actions for `Start Pitch` and `Start Pitch Review`, with clearer participant and judge-facing copy.
3. Change backend lifecycle guards and routes so entering `pitch` never creates judge assignments, and starting `pitch_review` is the point where finalist assignments are created.
4. Update the relevant unit and integration coverage for lifecycle guards and state presentation, then run `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
User approved the canonical naming: add a live `pitch` stage and keep `pitch_review` as the post-pitch scored review stage.

User approved implementing the full docs, lifecycle, UI, and test update in one pass.

Implemented the canonical `pitch` state end to end: docs, schema/state enums, admin lifecycle helpers, public state presentation, and judge dashboard copy now distinguish live pitch from post-pitch review.

Added `POST /api/hackathons/:hackathonId/actions/start-pitch` to transition into the live pitch stage without creating judge assignments. `start-pitch-review` now requires the hackathon to already be in `pitch` before it creates finalist review assignments.

The shortlist flow still starts the live pitch stage from the Competition tab because that transition depends on the persisted finalist selection. The Operations tab now owns the next manual transition from `pitch` to `pitch_review`.

Validation passed after the final change set: `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a dedicated `pitch` lifecycle stage between shortlist and `pitch_review` so teams have a clear live presentation phase before judges receive final review work. The canonical docs, state enums, public/admin presentation helpers, and judging lifecycle guards now all model `pitch` as the live stage and `pitch_review` as the post-pitch scored review stage.

Implemented a new `start-pitch` admin action that transitions shortlisted or pitch-only hackathons into the live pitch stage without creating assignments. `start-pitch-review` now requires the hackathon to already be in `pitch`, and only then creates the finalist pitch-review assignments. Admin copy was updated so shortlist now advances to pitch, pitch explicitly tells admins and judges that live presentations are happening, and pitch review is described as post-pitch judge scoring.

Updated the relevant unit, integration, and BDD coverage for the new lifecycle split, including route tests for `start-pitch` and the revised `start-pitch-review` guard. Local validation passed with `bun run lint`, `bun run typecheck`, and `bun run test:unit`. Residual scope note: the shortlist-to-pitch transition still lives in the Competition tab because it depends on the saved finalist selection, while the pitch-to-pitch-review transition is managed from Operations.
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
