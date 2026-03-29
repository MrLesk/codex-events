---
id: TASK-81
title: Add compact field labels to the account prize editor
status: Done
assignee: []
created_date: '2026-03-29 15:50'
updated_date: '2026-03-29 15:52'
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
Refine the admin prize editor in the account hackathon Prizes tab so the editable prize fields use persistent labels instead of placeholder-only inputs, while keeping each prize row as compact as the current layout. Use tighter controls and a denser desktop grid rather than adding extra vertical bulk.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Prize rows in the admin Prizes tab show clear labels for the editable fields.
- [x] #2 The existing prize rows remain at roughly the current vertical density by using a denser desktop layout and more compact controls.
- [x] #3 The add-prize form uses the same labeled field pattern as the existing editable prize rows.
- [x] #4 Mobile layout remains usable and readable without overflowing controls.
- [x] #5 Validation passes and any lack of automated UI coverage is documented if no focused test is practical.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Confirmed canonical docs remain unchanged for this UI-only prize-editor refinement.

Added persistent labels to both existing prize rows and the add-prize form, while tightening control padding and consolidating the desktop fields into a denser single grid row plus description row.

No focused automated UI test was added because this change is limited to template structure and spacing in an area without component-level interaction tests; existing validation was used to catch regressions.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated the admin prize editor in the account hackathon Prizes tab so both existing prize rows and the add-prize form use persistent field labels instead of placeholder-only controls. To keep the rows compact, the desktop layout now packs name, reward value, currency, reward type, awarded-to scope, and rank range into one denser grid row with smaller control chrome, while description stays on a short second row. Mobile still collapses naturally to a readable stacked layout.

This was implemented entirely inside the existing prize editor template without changing prize ordering, permissions, or save behavior. Validation passed with `bunx vitest run tests/unit/app/utils/reorder-list.test.ts tests/unit/app/utils/account-hackathon-tabs.test.ts`, `bun run typecheck`, `bun run test:unit`, and `bun run lint` (lint still reports the pre-existing `vue/no-v-html` warnings in the legal/static pages). Residual gap: there is still no focused automated component coverage for this prize-editor layout, since the repo does not currently test this admin UI at that level.
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
