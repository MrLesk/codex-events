---
id: TASK-176
title: Align participant overview and team card surfaces
status: Done
assignee: []
created_date: '2026-04-03 20:37'
updated_date: '2026-04-03 21:07'
labels:
  - ui
  - participant-experience
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Align the participant account hackathon overview and Team tab cards to a single surface system. The shared AppCard header should render the divider treatment automatically, the overview participation panel should use AppCard instead of custom markup, and the participant team/submission panels should use the lighter inset surface styling from the overview rather than the darker app inset card treatment.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 AppCard renders the title/subtitle header region with the standard divider and spacing without each caller adding its own divider markup
- [x] #2 The account hackathon Overview participation card uses AppCard and matches the standard card spacing and header treatment
- [x] #3 The participant Team tab panels use the same lighter inset surface styling, radius, and padding as the Overview inset panels
- [x] #4 Project submission in the Team tab uses the updated inset surface styling consistently across summary blocks and form sections
- [x] #5 Relevant tests are updated or added where shared component behavior changes require it
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aligned the participant account overview and Team tab surfaces to a shared lighter card system. AppCard now owns the standard header divider treatment, the overview participation panel uses AppCard, and the participant team/submission panels use the updated inset surfaces, radius, and spacing instead of the older darker treatment. Validation passed with `bun run lint`, `bun run typecheck`, and `bun run test:unit`. No dedicated Vue component harness exists in this repo, so shared visual behavior was validated through the existing suite and browser verification.
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
