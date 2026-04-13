---
id: TASK-204
title: Define configurable blind and pitch judging flow in canonical docs
status: Done
assignee:
  - '@codex'
created_date: '2026-04-12 21:51'
updated_date: '2026-04-12 21:58'
labels:
  - docs
  - judging
  - product-model
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/permissions-matrix.md
  - docs/schema-outline.md
  - docs/api-surface.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Document the canonical judging model for hackathons that may use 0, 1, or 2 blind reviews per submission plus an optional pitch review stage. The docs should define stage visibility, finalist selection, score normalization, configurable blind and pitch weights with defaults of 70% blind and 30% pitch, and the lifecycle, schema, permission, and API changes required to support blind-only, blind-plus-pitch, and pitch-only hackathons.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Canonical docs define hackathon judging configuration for 0, 1, or 2 blind reviews per submission plus an optional pitch review, including default blind and pitch score weights of 70 and 30 and a shared 0 to 10 score scale.
- [x] #2 Lifecycle, permissions, and API docs define the valid judging paths for blind-only, blind-plus-pitch, and pitch-only hackathons, including manual finalist selection in shortlist, open pitch visibility, and a final deliberation step before winner announcement.
- [x] #3 Domain and schema docs define the canonical scoring and judging records, including averaging blind review scores per submission, averaging submitted pitch votes across judges, allowing admins to close pitch review with missing votes, and combining enabled stages into the final score.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the canonical docs to define per-hackathon judging configuration with `blindReviewCount` values `0`, `1`, or `2`, optional `pitchReviewEnabled`, and configurable `blindScoreWeightPercent` / `pitchScoreWeightPercent` defaults of `70` / `30`.
2. Revise the hackathon lifecycle so `shortlist` is only the manual finalist-selection step before pitch review, `pitch_review` is optional, and `final_deliberation` becomes the universal last ranking stage before `winners_announced`.
3. Update the domain and schema docs to make judging stage-aware, separate blind and pitch visibility, define blind score normalization to `0..10`, define pitch scores on the same `0..10` scale, and define final-score aggregation from enabled stages.
4. Update permissions and API docs to cover blind-only, blind-plus-pitch, and pitch-only hackathons, including all-judge pitch voting, admin ability to close pitch review with missing votes, and final combined score behavior.
5. Run a consistency pass across the canonical docs plus `bun run lint`, `bun run typecheck`, and `bun run test:unit`, then record residual runtime-alignment risk in the task notes and summary.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
User approved the canonical direction: hackathons may use 0, 1, or 2 blind reviews per submission, optional pitch review, configurable blind and pitch weights defaulting to 70/30, pitch scores use the same 0..10 scale as blind scoring, shortlist is manual finalist selection, and admins may close pitch review with missing votes using the average of submitted pitch votes only.

Updated the canonical docs to replace the single blind-review assumption with configurable hackathon judging settings: `blindReviewCount` (`0`, `1`, or `2`), optional `pitchReviewEnabled`, and configurable `blindScoreWeightPercent` / `pitchScoreWeightPercent` defaults of `70` / `30`.

Reworked the lifecycle so `shortlist` is now the manual finalist-selection step before pitch review, `pitch_review` is optional, and `final_deliberation` is the universal final ranking stage before winner announcement.

Documented stage-aware judging rules: blind review remains anonymized, pitch review is open, pitch review creates one assignment per finalist submission per judge in the frozen pitch panel, and admins may close pitch review with missing votes using only submitted pitch votes in the average.

Ran validation successfully: `git diff --check`, `bun run lint`, `bun run typecheck`, and `bun run test:unit`.

This task is documentation-only. Runtime code, data model, and automated test coverage still reflect the previous single-blind-review / shortlist-final-order implementation and will need follow-up implementation work to align with the new canonical model.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated the canonical judging model across `docs/domain-model.md`, `docs/lifecycle-and-state-machines.md`, `docs/permissions-matrix.md`, `docs/schema-outline.md`, and `docs/api-surface.md` to support per-hackathon judging configuration with `0`, `1`, or `2` blind reviews per submission, optional pitch review, and configurable blind/pitch score weights that default to `70` / `30` when both stages are enabled.

The docs now define stage-specific visibility and scoring rules: blind review remains anonymized and uses weighted criterion scores normalized to the shared `0..10` scale, pitch review is open and uses `0..10` pitch scores averaged across submitted judge votes only, and final ranking happens in `final_deliberation` rather than `shortlist`. `shortlist` now exists only for blind-plus-pitch hackathons and is used to persist the ordered finalist set that advances to pitch review.

Validation run: `git diff --check`, `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
Residual risk: the runtime, persistence layer, and tests still implement the older single-blind-review / shortlist-final-order model, so follow-up implementation work is required to align code with the new canonical docs.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Relevant validation commands pass
- [x] #3 Auth and permissions changes follow the documented platform model
- [x] #4 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
