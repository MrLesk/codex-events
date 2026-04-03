---
id: TASK-177
title: Standardize canonical form field controls across the site
status: Done
assignee: []
created_date: '2026-04-03 20:55'
updated_date: '2026-04-03 21:07'
labels:
  - ui
  - design-system
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the split field styling across participant, admin, judging, and public pages with one canonical text/select/textarea control system based on the settings-tab field treatment. Shared primitives should own radius, background, padding, focus, and disabled/error behavior so feature templates stop carrying bespoke field classes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A shared canonical field primitive exists for text inputs textarea controls and select controls
- [x] #2 Existing participant admin judging and public pages use the shared field system for standard text select and textarea fields
- [x] #3 The older white field and rounded-2xl field styles are removed from standard visible form controls
- [x] #4 Numeric fields keep working correctly through v-model.number on the shared input component
- [x] #5 Validation passes locally for lint typecheck and unit tests
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Standardized the site on one canonical text field system based on the settings-tab control treatment. Added shared AppInput, AppTextarea, and AppSelect behavior with consistent radius, background, padding, focus, disabled state, and `v-model.number` handling, then migrated participant, admin, public, judging, and settings forms onto the shared controls. Also fixed form-grid overflow by making single-column field stacks explicit `grid-cols-1`. Hidden file inputs, checkboxes, and the imprint honeypot remain raw by design. Validation passed with `bun run lint`, `bun run typecheck`, and `bun run test:unit`. There is still no dedicated component-test harness in this repo, so the shared control behavior was verified through the existing suite and in-browser inspection.
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
- [x] #9 Backlog task records the remaining edge-case exceptions such as hidden file inputs or raw event-driven controls if any remain
<!-- DOD:END -->
