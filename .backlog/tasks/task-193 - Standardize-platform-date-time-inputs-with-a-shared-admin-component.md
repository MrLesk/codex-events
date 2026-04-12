---
id: TASK-193
title: Standardize platform date-time inputs with a shared admin component
status: Done
assignee:
  - Codex
created_date: '2026-04-12 11:25'
updated_date: '2026-04-12 11:27'
labels:
  - ui
  - admin
  - forms
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create a shared date-time input component for hackathon admin scheduling so agenda items and registration/submission timeline fields use one explicit platform pattern. Current date entry is handled with native datetime-local inputs inside the shared hackathon config form; this task should centralize that UI without changing stored date semantics, validation rules, or admin workflows.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Agenda item start and end fields use the shared date-time input component in the admin hackathon form.
- [x] #2 Registration and submission schedule fields use the same shared date-time input component in the settings flow.
- [x] #3 All current platform date-time entry fields are routed through the shared component without changing ISO persistence or existing validation behavior.
- [x] #4 Required local validation commands are run and any gaps are documented.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a shared AppDateTimeInput component that wraps the existing native datetime-local input pattern and preserves the current visual language.
2. Replace every current datetime-local usage in HackathonConfigForm so agenda schedule fields and registration/submission timeline fields both route through the new component.
3. Keep the existing form schema and ISO conversion helpers unchanged unless implementation exposes a real defect.
4. Run bun run lint, bun run typecheck, and bun run test:unit, then record results and any follow-up risk.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added AppDateTimeInput as a shared native datetime-local wrapper with a trailing picker button that calls showPicker() when supported and falls back to focus otherwise.

Replaced all current hackathon admin datetime-local fields in HackathonConfigForm so agenda items and registration/submission schedule inputs now use the shared component.

Canonical docs remain unchanged because this refactor does not alter domain rules, persistence shape, permissions, or workflow semantics.

Validation completed successfully with bun run lint, bun run typecheck, and bun run test:unit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a shared AppDateTimeInput component for admin scheduling fields and migrated every current datetime-local usage in HackathonConfigForm to it. The new wrapper preserves the existing native datetime-local data model and validation flow, but standardizes the UI behind one platform component and adds a consistent picker affordance with browser-native fallback behavior.

No canonical product docs changed because the refactor does not affect domain rules or product behavior. Validation passed locally with bun run lint, bun run typecheck, and bun run test:unit. Existing utility and schema tests continue to cover the ISO/local datetime conversion and validation paths; no separate component-test harness was introduced for this UI-only refactor. Residual risk is limited to browser differences in native datetime picker support, which is mitigated by continuing to rely on the underlying native input and falling back to focus when showPicker() is unavailable.
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
