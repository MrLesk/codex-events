---
id: TASK-435
title: Make agenda block duration reliably editable
status: Done
assignee:
  - '@Codex'
created_date: '2026-08-22 11:05'
updated_date: '2026-08-22 11:20'
labels: []
dependencies: []
references:
  - app/components/admin/builder/molecules/AdminBuilderDurationStepper.vue
  - app/domains/events/builder.ts
  - app/components/admin/builder/molecules/AdminBuilderBlockCard.vue
modified_files:
  - app/components/admin/builder/molecules/AdminBuilderDurationStepper.vue
  - app/domains/events/builder.ts
  - tests/unit/app/domains/events/builder.test.ts
  - tests/bdd/features/authenticated/event-builder.feature
  - tests/bdd/steps/event-builder.steps.ts
priority: high
type: enhancement
ordinal: 153000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Event admins using the new event builder must be able to type an agenda block duration directly in minutes while the builder continues deriving every agenda item's start and end from the event start and preceding block durations. The compact duration control should remain visually balanced within an agenda row.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Each agenda block duration is directly editable as an integer number of minutes without requiring individual agenda start or end fields.
- [x] #2 The decrement and increment controls change durations by 1 minute below 10 minutes and by 5 minutes at and above 10 minutes, with an intuitive transition through 9 and 10 minutes.
- [x] #3 Directly entered valid minute values are preserved and immediately update the derived sequential agenda times and balance calculations.
- [x] #4 The duration control remains compact, readable, keyboard accessible, and visually aligned in the builder agenda row across supported viewport sizes.
- [x] #5 Focused tests cover direct entry, duration bounds, threshold stepping, and derived sequential timing.
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
1. Refine AdminBuilderDurationStepper so clearing/replacing the number field does not coerce an intermediate empty value, valid integer input is clamped to the existing 1–480 bounds, arbitrary values such as 12 or 17 stay exact, and blur restores the canonical value after incomplete input.
2. Preserve the existing dynamic button stepping helper and reactive props/events path so schedule and balance continue recomputing from ordered block durations without adding per-item timestamps.
3. Extend focused unit coverage for input normalization, bounds, arbitrary above-threshold values, the 9↔10 button transition, and sequential schedule derivation; add a focused real-browser builder scenario for direct entry and immediate downstream timing.
4. Run targeted tests, inspect the rendered control at desktop and mobile widths with the existing authenticated local fixture, then run lint, typecheck, unit, integration/BDD validation required for the touched browser flow and finalize TASK-435 with evidence.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Research: the recent partial implementation already introduced the compact number input, 1–480 bounds, dynamic step helper, and computed schedule/balance pipeline. The remaining reliability gap is that Number('') immediately coerces a cleared field to the minimum, making replacement typing fragile; focused interaction coverage is also absent. Component map: AdminBuilderDurationStepper owns manual input and buttons; AdminBuilderBlockCard provides the typed v-model bridge; useEventBuilder remains the sole state owner and derives schedule/balance through computed values. No new component or refactor is needed.

Implementation evidence: manual duration entry now commits only digit-only integer values, clamps them to 1–480, preserves arbitrary values such as 12 and 17, and leaves an empty replacement state uncommitted until typing resumes. Blur restores the canonical value after incomplete input. Existing threshold-aware buttons remain unchanged, including 9↔10 transitions, and the computed schedule and balance pipeline remains the sole source of derived timing.

Validation: bun run lint passed; bun run typecheck passed; bun run test:unit passed (168 files, 1125 tests); bun run test:integration passed (44 files, 491 tests); full bun run test:bdd passed (90 primary scenarios and 2 destructive scenarios); git diff --check passed. Targeted builder-domain tests passed (32 tests), and the focused duration BDD scenario passed. The full browser suites emitted pre-existing Vue toRefs warnings but no test failures.

Visual evidence: authenticated Playwright inspection at 1280×720 and 375×812 confirmed the 17-minute control remained readable and aligned. At 375px the page had no horizontal overflow (innerWidth and scrollWidth both 375), and the control stayed fully inside its agenda row. Screenshots: /Users/alex/.codex/visualizations/2026/08/22/01a0291e-d246-71e1-8410-f1660d2bc0e7/task-435-desktop.png and /Users/alex/.codex/visualizations/2026/08/22/01a0291e-d246-71e1-8410-f1660d2bc0e7/task-435-mobile.png. The signed-out in-app browser could not access the authenticated builder, so the existing authenticated Playwright fixture provided interactive and visual proof instead.

Canonical product docs, setup/configuration, and auth/permissions remain unchanged. No automation gap or known task-specific follow-up remains.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Agenda block durations now support reliable direct integer replacement without snapping typed values to the five-minute button grid. Empty or incomplete input no longer mutates state, valid values are bounded to 1–480, blur restores canonical state, and the existing sequential schedule and balance calculations update from the exact entered duration. Focused unit and authenticated browser coverage verifies direct entry, bounds, arbitrary above-threshold values, 9↔10 stepping, downstream agenda times, and desktop/mobile layout. All required and integration/browser validations pass; no known task-specific risk remains.
<!-- SECTION:FINAL_SUMMARY:END -->
