---
id: TASK-79
title: Move account hackathon agenda settings into the Details tab
status: Done
assignee: []
created_date: '2026-03-29 15:39'
updated_date: '2026-03-29 15:42'
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
Relocate the admin agenda editing controls on the account hackathon page so they appear in the Details tab directly below the existing all-users agenda section, instead of inside the Settings tab. Keep the public agenda presentation intact and avoid duplicating unrelated settings controls.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The Details tab continues to show the existing public agenda section for all viewers.
- [x] #2 Hackathon admins and platform admins see the agenda editing controls directly below the public agenda section in the Details tab.
- [x] #3 The Settings tab no longer includes the agenda editing controls.
- [x] #4 The moved agenda editor reuses existing save behavior and does not duplicate unrelated settings controls.
- [x] #5 Relevant automated coverage is updated for any changed tab-composition or visibility behavior.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Confirmed canonical docs remain unchanged for this account-workspace UI move.

Added a three-mode hackathon config form surface so the existing settings form can exclude the agenda editor while the Details tab reuses the same save path in an agenda-only view.

Extended account hackathon tab access metadata with an explicit admin-only details agenda-configuration flag and updated unit coverage for the new visibility behavior.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Moved the admin agenda editing controls out of the account hackathon Settings tab and into the Details tab, directly below the existing public agenda section. The public Details experience stays intact for all viewers, while hackathon admins and platform admins now get an agenda-only configuration form there that reuses the existing hackathon save path. The Settings tab keeps the rest of the configuration form but no longer includes the agenda editor.

Implemented the move by adding display modes to the shared hackathon config form so the same form stack can render full create flow, settings-without-agenda, and agenda-only variants without duplicating unrelated controls or save logic. Also extended the account hackathon tab access helper with an explicit admin-only details agenda-configuration flag and updated its unit tests.

Validation passed with `bunx vitest run tests/unit/app/utils/account-hackathon-tabs.test.ts`, `bun run typecheck`, `bun run test:unit`, and `bun run lint` (lint still reports the pre-existing `vue/no-v-html` warnings in the legal/static pages). No canonical doc updates were needed for this UI-only change.
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
