---
id: TASK-315
title: Adjust platform legal field layout
status: Done
assignee: []
created_date: '2026-05-26 19:58'
updated_date: '2026-05-26 19:59'
labels: []
dependencies: []
modified_files:
  - app/pages/account/platform-legal.vue
priority: low
ordinal: 18000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the platform legal settings form so legal contact languages spans the full form width and business purpose shares a responsive two-column row with editorial line.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Legal contact languages renders as a full-width field below operator/contact details.
- [x] #2 Business purpose and editorial line render in a two-column grid on medium-and-larger screens and stack on small screens.
- [x] #3 Required validation passes before commit.
<!-- AC:END -->



## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Adjusted the platform legal settings form layout in `app/pages/account/platform-legal.vue`: operator/contact details remain in the existing two-column grid, legal contact languages is full width, and business purpose plus editorial line share a responsive two-column grid. Validation passed before commit: `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `git diff --check`.
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
