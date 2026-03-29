---
id: TASK-87
title: Add an agenda-only save button beside Add item in the Details tab editor
status: Done
assignee:
  - '@Codex'
created_date: '2026-03-29 16:28'
updated_date: '2026-03-29 16:31'
labels:
  - admin
  - ui
  - hackathons
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a section-local save action to the admin agenda editor shown in the account hackathon Details tab. The new button should appear on the same row as the Add item action, aligned to the right, and it should persist only agendaItems instead of sending the full hackathon configuration payload.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The agenda-only editor in the account hackathon Details tab shows a Save Agenda button aligned to the right of the Add item action row.
- [x] #2 Using Save Agenda persists only agendaItems through the existing hackathon PATCH route.
- [x] #3 The existing footer save action remains available and unchanged for the shared form.
- [x] #4 Relevant automated tests are updated when practical, or the test gap is documented if this remains a UI-only change without local component coverage.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend the shared hackathon config form with an optional agenda-only secondary submit action that renders on the Add item row and emits a dedicated save event only in agenda-only mode.
2. Pass that event through the admin create/edit wrapper and add an agenda-only PATCH handler in the account hackathon admin settings panel that sends only agendaItems.
3. Run validation and document the lack of component-level automation if no existing test harness covers this UI interaction cleanly.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Confirmed the canonical docs remain unchanged because this is an admin-only UX/save-path refinement, not a product-rule change.

Added a dedicated inline `Save Agenda` action in the shared agenda editor row for Details mode and wired it through the admin wrapper to a PATCH body containing only `agendaItems`.

Added a server-side unit test covering agenda-only patch serialization. There is still no local Vue component test harness for this form interaction, so the exact button placement remains a browser-verified UI behavior.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a section-local `Save Agenda` button to the account hackathon Details-tab agenda editor so admins can save schedule changes from the same action row as `Add item` without sending the full hackathon configuration payload. The shared `HackathonConfigForm` now emits a dedicated agenda-only submit event in Details mode, `AdminHackathonCreateEditForm` passes that event through with the current cloned form state, and `AccountHackathonAdminSettingsPanel` routes it to a partial hackathon `PATCH` containing only serialized `agendaItems` while leaving the existing footer save path intact.

Validation: `bunx vitest run tests/unit/server/utils/hackathon-management.test.ts`, `bun run typecheck`, `bun run test:unit`, and `bun run lint` all passed; lint still reports the existing `vue/no-v-html` warnings in the legal/static pages. Added unit coverage for agenda-only patch serialization in `tests/unit/server/utils/hackathon-management.test.ts`. Residual gap: the inline button placement and click flow are not covered by component tests because this repo does not currently have a local Vue test harness for this admin form area.
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
