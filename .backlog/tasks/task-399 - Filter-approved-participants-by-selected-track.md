---
id: TASK-399
title: Filter approved participants by selected track
status: Done
assignee:
  - Codex
created_date: '2026-06-14 15:34'
updated_date: '2026-06-14 15:43'
labels:
  - applications
  - events
  - tracks
  - admin
  - nuxt
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/api-surface.md
priority: high
ordinal: 78000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Admins need to review approved participants by their selected event track. The approved participant list should keep an All view, expose per-track filters with approved participant counts, and show each participant's selected track as a chip on the participant row.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Approved participant list includes an All filter showing every approved participant.
- [x] #2 Approved participant list includes one filter per configured track with the count of approved participants who selected that track.
- [x] #3 Selecting a track filter shows only approved participants with that selected track.
- [x] #4 Each approved participant row displays the selected track name as a chip when available.
- [x] #5 Participants without a selected track remain visible in All and are not counted under any track.
- [x] #6 Relevant tests and validation are updated or run.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add selectedTrackId to the frontend admin application record type and add review-domain helpers for approved selected-track counts and track filtering.
2. Pass event tracks from account event participant panels into the admin application review panel.
3. Add an Approved-track segmented filter with an All option, per-track counts, and selected-track chips on participant rows.
4. Update canonical docs and unit coverage, then run validation.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented track-aware approved participant review filters and row chips. Counts include approved applications with selectedTrackId only; All includes every approved participant, including participants without a selected track. Validation passed: bunx vitest run tests/unit/app/domains/applications/admin-application-review.test.ts, bun run typecheck, git diff --check, bun run lint, bun run test:unit, bun run test:integration, bun run test:bdd.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Approved participant review now has an All track filter, per-track approved counts, selected-track filtering, and selected-track chips on participant rows. Updated docs and unit coverage; full lint, typecheck, unit, integration, and BDD validation passed.
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
