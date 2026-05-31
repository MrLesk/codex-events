---
id: TASK-348
title: Move configuration save errors to form actions
status: Done
assignee:
  - Codex
created_date: '2026-05-31 19:02'
updated_date: '2026-05-31 19:05'
labels: []
dependencies: []
modified_files:
  - app/components/account/events/AccountEventAdminSettingsPanel.vue
  - app/components/admin/AdminEventCreateEditForm.vue
  - app/components/admin/EventConfigForm.vue
priority: medium
ordinal: 51000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Configuration save failures should appear beside the configuration save action instead of at the top of the settings tab. Other admin-action failures such as prize or terms saves should keep their existing scoped/top-level behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Configuration save API errors render in the program settings form action area directly above or beside the Save Configuration, Save Details, or Create Draft Event button.
- [x] #2 The top-of-tab Admin action failed alert is not used for configuration save failures.
- [x] #3 Prize and terms mutation errors are not incorrectly routed to the configuration save action area.
- [x] #4 Existing form validation errors continue to render in the same action area as before.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a submit-error prop to `EventConfigForm` and render it next to existing form validation errors in each save-action block.
2. Change `AdminEventCreateEditForm` to pass submit errors through to `EventConfigForm` instead of rendering them above the whole form.
3. Split configuration save errors in `AccountEventAdminSettingsPanel.vue` into a dedicated `configMutationError`, pass it to the program settings form, and leave `mutationError` for unrelated admin actions such as prizes and terms.
4. Run targeted inspection, then `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented the planned submit-error routing. Configuration save errors now use `configMutationError` and are passed into the program settings form, while the shared `mutationError` remains for unrelated admin actions. No canonical docs, config, workflow docs, auth, or permissions updates were needed. There is no existing component test harness for this visual placement; validation passed with `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Summary:
- Routed submit errors through `AdminEventCreateEditForm` into `EventConfigForm` so they render in the save-action area beside existing validation errors.
- Split configuration save failures into `configMutationError` so the top-of-tab admin action alert is not used for Save Configuration/Save Details failures.
- Left prize and terms mutation errors on their existing admin-action paths.

Validation:
- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`

Risks and follow-ups:
- No known follow-ups. Visual placement was verified by code inspection; this repo does not currently have a component test harness for this form footer placement.
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
