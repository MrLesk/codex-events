---
id: TASK-82
title: Tighten prize editor row layout in the account Prizes tab
status: Done
assignee: []
created_date: '2026-03-29 16:05'
updated_date: '2026-03-29 16:06'
labels:
  - ui
  - admin
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Adjust the admin prize editor row layout in the account hackathon Prizes tab so the description field is smaller, some controls move from the first field row down beside the description, and the left drag handle is vertically centered against the row content.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The prize editor description field is visually smaller by default in both existing prize rows and the add-prize form.
- [x] #2 Some prize fields move from the first row into the second row beside the description, making the top row less crowded.
- [x] #3 The drag handle is vertically centered relative to the prize row content.
- [x] #4 Mobile layout remains usable and readable.
- [x] #5 Validation passes and any lack of focused automated UI coverage is documented if no practical test exists.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Confirmed canonical docs remain unchanged for this UI-only prize-editor layout pass.

Reduced the default description footprint to a one-line textarea, moved awarded-to and rank fields into the second row beside description, and centered the left drag handle against the row content.

No focused automated UI test was added because this remains a template/layout refinement in an admin area without component-level coverage; existing validation was used to catch regressions.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Adjusted the admin prize editor rows in the account hackathon Prizes tab so the first row is less crowded and the second row carries the smaller default description field beside the awarded-to and rank controls. The add-prize form now follows the same two-row layout, and the left drag handle is vertically centered against the prize row content instead of hugging the top edge.

This keeps the labeled field pattern from the prior pass, but makes the description footprint lighter and redistributes fields to better match the row shape you asked for. Validation passed with `bun run typecheck`, `bun run test:unit`, and `bun run lint` (lint still reports the pre-existing `vue/no-v-html` warnings in the legal/static pages). Residual gap: there is still no focused automated component coverage for this prize-editor layout, since the repo does not currently test this admin UI at that level.
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
