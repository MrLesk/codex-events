---
id: TASK-256
title: Refine agenda time pills on hackathon details tabs
status: Done
assignee:
  - codex
created_date: '2026-04-17 18:17'
updated_date: '2026-04-17 18:17'
labels:
  - ui
  - hackathon-details
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Polish the shared agenda presentation used on the public and account hackathon detail pages so time ranges read correctly and the mobile layout is visually consistent. This work covers collapsing redundant start/end timestamps, rendering mobile time ranges as two pills with a center arrow, and aligning the agenda time-pill sizing with the existing status badge styling used elsewhere on the detail experience.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Agenda items whose end time equals their start time show a single time label without a range arrow.
- [x] #2 On mobile, agenda items with distinct same-day start and end times render as two time pills with a center arrow instead of one combined pill.
- [x] #3 Agenda time pills use the same badge sizing for both single-time and split-time presentations, and the shared component keeps public and account detail pages aligned.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the shared agenda presentation helper so identical start and end timestamps collapse to a single displayed time while preserving existing cross-day formatting.
2. Adjust the shared HackathonAgendaPanel mobile layout to render same-day time ranges as two pills with a center arrow, and keep the single-pill desktop presentation for larger breakpoints.
3. Normalize agenda time pill sizing to the same badge styling already used in the detail timeline so single-time and split-time states match.
4. Validate with the agenda presentation unit test plus the required repo checks: bun run lint, bun run typecheck, and bun run test:unit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented the change in the shared agenda component/composable path so public and account detail pages stay aligned without separate view logic.

Added a presentation-helper type guard so equal start/end timestamps collapse to one label while cross-day ranges keep their existing combined text format.

Updated the mobile agenda layout to show two time pills with a center arrow for distinct same-day ranges, fixed an initial double-render visibility issue, and then aligned the final pill styling to the existing detail timeline badge sizing.

Validation passed: bun run test:unit -- --run tests/unit/app/composables/useHackathonPresentation.test.ts, bun run lint, bun run typecheck, bun run test:unit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated the shared agenda presentation used by both the public and account hackathon detail pages so agenda items with identical start and end timestamps render as a single time label, while same-day mobile ranges render as two time pills with a center arrow. Normalized the agenda time-pill styling to match the existing timeline status badge sizing so the single-time and split-time states stay visually consistent.

Tests and validation: added coverage for the equal start/end case in tests/unit/app/composables/useHackathonPresentation.test.ts and ran bun run lint, bun run typecheck, and bun run test:unit.

Risks and follow ups: no canonical docs or config changes were required; no additional follow-up work is known from this change.
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
