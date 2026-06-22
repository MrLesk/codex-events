---
id: TASK-419
title: Update participant track counts with checked-in filter
status: Done
assignee:
  - '@codex'
created_date: '2026-06-22 20:35'
updated_date: '2026-06-22 20:41'
labels: []
dependencies: []
ordinal: 98000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When an event admin enables the Checked in filter in the event Participants tab, the per-track participant counts should reflect the visible checked-in participant set instead of continuing to show all approved participants.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The Participants tab recalculates the All and per-track counts when the Checked in filter is enabled
- [x] #2 Track counts still include all approved participants when the Checked in filter is disabled
- [x] #3 Validation covers the corrected count behavior
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Trace how the Participants tab derives visible applicants, track counts, and checked-in filtering.
2. Update the shared domain/UI derivation so per-track counts use the same attendance-filtered participant set when Checked in is enabled.
3. Add focused unit coverage for checked-in track counts.
4. Run required validation and record the task outcome.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented a shared approved-track-count filter that uses the effective checked-in state, including manual joined/not-joined overrides. The Participants tab now derives the All and per-track badges from that filtered approved participant set when Checked in is enabled. Canonical docs, configuration, and auth/permissions behavior were confirmed unchanged.

Validation passed: bun vitest run tests/unit/app/domains/applications/admin-application-review.test.ts; bun run lint; bun run typecheck; bun run test:unit; bun run test:integration; bun run test:bdd.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated the Participants tab track count derivation so Checked in filters update the All and per-track badges. Added unit coverage for effective checked-in attendance, including manual overrides, and verified with lint, typecheck, unit, integration, and BDD suites.
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
