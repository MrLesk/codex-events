---
id: TASK-197
title: Add a reusable countdown component for scheduled product surfaces
status: Done
assignee:
  - codex
created_date: '2026-04-12 13:51'
updated_date: '2026-04-12 14:04'
labels: []
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create a reusable site-wide countdown UI that can present scheduled dates in a polished, product-native way across participant and public surfaces. The component must handle scheduled windows and manual activation states without implying that a scheduled time automatically changes hackathon lifecycle state.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A reusable countdown component is available for use across the website and supports a polished card-style presentation
- [x] #2 The component can present both a live countdown and the corresponding absolute timestamp in the viewer's local time
- [x] #3 The component supports scheduled states where the target time has passed but the product is still waiting for a manual activation or status change
- [x] #4 The account hackathon submission tab uses the reusable countdown component instead of a static scheduled-open card
- [x] #5 Unit tests cover countdown state resolution and formatted countdown output for representative upcoming and post-target scenarios
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add shared countdown helpers that resolve countdown status and formatted time segments from absolute timestamps without inferring lifecycle changes from schedule alone.
2. Build a reusable countdown UI component that supports a polished card presentation, optional inline density, countdown plus absolute timestamp, and a post-target waiting state.
3. Replace the static scheduled-open card in the account hackathon submission tab with the reusable countdown component.
4. Add unit tests for countdown state resolution and formatted countdown output, then run lint, typecheck, and unit tests.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Discovery: use the existing hackathon detail panel and inset-card styling as the visual base, with public timeline window cards as the closest reusable analog.

Risk: hackathon submission opening is manually activated within the configured submission window, so the component must support a scheduled-time-passed waiting state instead of treating zero as automatic activation.

Implemented a shared countdown utility and reusable AppCountdownCard component with countdown, absolute timestamp, and post-target waiting or expired states.

Integrated the reusable countdown into the participant submission tab so scheduled submission opening now shows a live countdown and switches to a waiting state if the scheduled time passes before organizers activate submission.

Validation: `bun run lint`, `bun run typecheck`, and `bun run test:unit` all passed locally. Canonical docs were confirmed unchanged because this is an implementation-only UI enhancement.

Follow-up refinement: remove the redundant compact countdown summary from the card variant after user feedback that the duplicated top-right summary adds no value.

Refined the reusable countdown card after UI review by removing the redundant compact summary from the card layout and disabling the local-time note by default so the component keeps a tighter information hierarchy.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a reusable site-wide countdown system for scheduled product surfaces. The shared countdown utility resolves countdown phases from absolute timestamps, formats countdown segments and accessible labels, and supports post-target waiting states so scheduled times do not imply automatic lifecycle transitions. Built `AppCountdownCard` as the reusable UI surface with a polished glass-panel treatment, segmented countdown display, optional timestamp metadata, and waiting or expired messaging for post-target states.

Replaced the static scheduled-open submission card in the participant hackathon submission tab with the reusable countdown component. That submission surface now shows a live countdown to the configured submission opening time and switches to a waiting-for-organizers message if the scheduled time passes before the hackathon actually enters `submission_open`, which keeps the UI aligned with the documented manual activation model.

Follow-up refinement tightened the card hierarchy by removing the redundant compact summary from the card layout and disabling the local-time note by default. Tests: `bun run lint`, `bun run typecheck`, and `bun run test:unit` all passed locally. Docs and config files did not require changes.
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
