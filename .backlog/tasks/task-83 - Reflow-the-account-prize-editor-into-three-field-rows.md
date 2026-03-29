---
id: TASK-83
title: Reflow the account prize editor into three field rows
status: Done
assignee: []
created_date: '2026-03-29 16:13'
updated_date: '2026-03-29 16:14'
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
Adjust the admin prize editor in the account hackathon Prizes tab so the labeled prize fields are arranged across three layout rows instead of the current denser split. Keep the drag handle centered, preserve the labeled controls, and apply the same structure to both existing prize rows and the add-prize form.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Existing prize rows in the admin Prizes tab use a three-row field layout.
- [x] #2 The add-prize form uses the same three-row field layout as the editable prize rows.
- [x] #3 The drag handle remains vertically centered relative to the prize row content.
- [x] #4 Mobile layout remains usable and readable.
- [x] #5 Validation passes and any lack of focused automated UI coverage is documented if no practical test exists.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Confirmed canonical docs remain unchanged for this prize-editor layout refinement.

Reflowed both existing prize rows and the add-prize form into three field rows: core reward identity, scope/rank controls, and full-width description.

No focused automated UI test was added because this remains a template/layout refinement in an admin area without component-level coverage; existing validation was used to catch regressions.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Reflowed the admin prize editor in the account hackathon Prizes tab into three explicit field rows. The first row now holds prize name, reward value, and currency; the second row holds reward type, awarded-to scope, and rank range; and the third row gives description its own full-width line. The add-prize form now matches the same structure, and the drag handle remains vertically centered beside the prize content.

This keeps the recent label and compact-control work, but makes the row shape calmer and easier to scan. Validation passed with `bun run typecheck`, `bun run test:unit`, and `bun run lint` (lint still reports the pre-existing `vue/no-v-html` warnings in the legal/static pages). Residual gap: there is still no focused automated component coverage for this prize-editor layout, since the repo does not currently test this admin UI at that level.
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
