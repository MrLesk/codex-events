---
id: TASK-86
title: Simplify hackathon details and settings admin layout
status: Done
assignee:
  - Codex
created_date: '2026-03-29 16:25'
updated_date: '2026-03-29 16:33'
labels:
  - admin
  - ui
  - hackathons
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Adjust the admin-facing hackathon workspace so public-facing program identity information is edited in the Details context rather than duplicated in Settings. Improve the location editing UI by keeping city, country, and address together and by making country selection a dropdown. Clarify the agenda-only helper copy so hackathon admins immediately understand what the save action affects.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The hackathon Settings tab no longer shows the Program Identity section or its location fields.
- [x] #2 Hackathon admins can edit city, country, and address together in one responsive row in the remaining Program Identity editing surface.
- [x] #3 Country is selected from a dropdown of country names and persists the same country string contract used by the existing hackathon form.
- [x] #4 The agenda-only helper copy clearly explains that edits update the public Details tab schedule for participants.
- [x] #5 Relevant automated tests are updated for the changed behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the account hackathon Details surface to use a dedicated program-settings mode that covers the participant-facing Details content, while the Settings tab keeps only the remaining admin setup controls.
2. Adjust the shared hackathon config form so Program Identity renders only in full/details modes, and lay out city, country, and address in one responsive row.
3. Add a shared country-options utility and switch the country field to a native select that still stores the existing country name string.
4. Rewrite the Details helper and save-success copy so hackathon admins understand these edits update the public Details tab content participants see.
5. Add focused automated test coverage for the new utility and affected form-mode behavior where practical, then run bun run test:unit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Confirmed canonical docs remain unchanged for this UI-only admin workspace refinement.

Moved the participant-facing Details editor semantics into a dedicated program-settings mode so Details saves only agenda and location fields instead of overwriting broader Settings data.

Implemented country dropdown options via Intl.DisplayNames with aggregate-region filtering to avoid a new dependency while keeping the stored country contract as a plain string.

Validation completed with bun run typecheck and bun run test:unit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Adjusted the account hackathon admin workspace so participant-facing Details content and Settings configuration are cleanly separated. The shared hackathon config form now uses a dedicated details mode that keeps Program Identity in the Details tab, hides it in Settings, and lays out city, country, and address together on one responsive row. Country now uses a dropdown backed by a shared options utility while preserving the existing persisted string contract.

The settings panel copy and save behavior were aligned with the new tab split. Details-mode saves now patch only the public Details-tab fields they own, and the helper/success copy now clearly explains that these edits update what participants see in the Details tab. I added focused unit coverage for the new mode semantics and country option generation.

Validation: bun run typecheck, bun run test:unit.
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
