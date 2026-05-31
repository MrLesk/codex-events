---
id: TASK-346
title: Fix Details save client validation
status: Done
assignee:
  - Codex
created_date: '2026-05-31 18:33'
updated_date: '2026-05-31 18:35'
labels: []
dependencies: []
modified_files:
  - app/components/admin/EventConfigForm.vue
  - app/domains/events/admin-event.ts
  - tests/unit/app/domains/events/admin-event-schema.test.ts
priority: medium
ordinal: 49000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Saving the event Details tab should not be blocked by validation for hidden full-configuration fields. Admins can press Save Details without changes and the client should allow the details PATCH to be sent when the visible details fields are valid.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Save Details validates the details form scope only: agenda items, city, country, and address.
- [x] #2 Hidden full-configuration fields such as judging settings, registration windows, tracks, and slug do not block the Details submit before the network request.
- [x] #3 Visible details fields still produce client validation errors when they are invalid.
- [x] #4 Relevant unit coverage verifies details-mode validation ignores invalid hidden fields while preserving visible-field validation.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a details-mode validation schema in `app/domains/events/admin-event.ts` that reuses the existing agenda item validation and validates only agenda items, city, country, and address.
2. Switch `EventConfigForm.vue` to use a computed vee-validate schema based on `formMode`, matching the existing dynamic-schema pattern used by participant registration.
3. Add unit tests in `tests/unit/app/domains/events/admin-event-schema.test.ts` proving details-mode validation ignores invalid hidden full-config fields and still rejects invalid visible details fields.
4. Run targeted unit tests, then the repo validation gate: `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented the planned details-mode schema split. Canonical docs, configuration, workflow docs, auth, and permissions are unchanged because this only changes client-side form validation scope. Validation passed: targeted `bunx vitest run tests/unit/app/domains/events/admin-event-schema.test.ts`, `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Summary:
- Added `eventDetailsFormSchema` so the Details save path validates only agenda items, city, country, and address.
- Switched `EventConfigForm` to select the vee-validate schema by form mode, following the existing computed schema pattern.
- Added schema tests covering hidden invalid full-configuration fields and visible details validation.

Validation:
- `bunx vitest run tests/unit/app/domains/events/admin-event-schema.test.ts`
- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`

Risks and follow-ups:
- No known follow-ups. The server patch path is unchanged; this only prevents hidden client-side fields from blocking Details submit.
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
