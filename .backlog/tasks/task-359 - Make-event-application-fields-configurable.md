---
id: TASK-359
title: Make event application fields configurable
status: Done
assignee:
  - Codex
created_date: '2026-05-31 21:03'
updated_date: '2026-05-31 21:53'
labels:
  - events
  - applications
  - admin
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/schema-outline.md
  - docs/api-surface.md
  - docs/permissions-matrix.md
  - docs/lifecycle-and-state-machines.md
  - docs/testing-strategy.md
modified_files:
  - app/components/admin/EventConfigApplicationFieldsTable.vue
  - app/components/admin/EventConfigForm.vue
  - app/components/applications/ParticipantApplicationRegistrationPanel.vue
  - app/composables/useParticipantApplication.ts
  - app/domains/applications/admin-application-record.ts
  - app/domains/applications/participant-application-form.ts
  - app/domains/applications/participant-application.ts
  - app/domains/events/admin-event.ts
  - app/domains/events/presentation.ts
  - app/domains/events/records.ts
  - app/pages/admin/events/new.vue
  - 'app/pages/events/[slug]/register.vue'
  - docs/api-surface.md
  - docs/domain-model.md
  - docs/schema-outline.md
  - drizzle/0053_application_field_visibility.sql
  - server/api/events/index.post.ts
  - server/database/schema.ts
  - server/domains/applications/index.ts
  - server/domains/applications/review-finalization.ts
  - server/domains/events/index.ts
  - tests/integration/server/api/admin-luma-backfill-routes.test.ts
  - tests/integration/server/api/application-routes.test.ts
  - tests/integration/server/api/event-routes.test.ts
  - tests/integration/server/api/public-luma-webhook-routes.test.ts
  - tests/unit/app/domains/admin-domain-modules.test.ts
  - tests/unit/app/domains/applications/participant-application-form.test.ts
  - tests/unit/app/domains/applications/participant-application.test.ts
  - tests/unit/app/domains/events/admin-event-schema.test.ts
  - tests/unit/app/domains/judging/workspace.test.ts
  - tests/unit/server/database/schema.test.ts
  - tests/unit/server/domains/applications/index.test.ts
  - tests/unit/server/domains/applications/luma-sync-queue.test.ts
  - tests/unit/server/domains/events/index.test.ts
priority: high
ordinal: 57000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Allow event admins to configure which participant application fields are visible and required for each event. Given name and family name remain mandatory and cannot be hidden or made optional. Field configuration stays editable after applications open; participants who already registered are not retroactively normalized, and the current configuration applies when a participant views or submits the form after a change. Defaults should reflect event type so registration-only Meetup and Build events can use a lighter application form than Hackathon events.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Event application field configuration is represented in the canonical docs, including editable-after-open behavior and locked mandatory identity fields.
- [x] #2 The event settings experience lets event admins review each configurable application field by field name, visibility, and requiredness.
- [x] #3 Given name and family name are always visible and required and cannot be changed by event admins.
- [x] #4 A field cannot be required when it is not visible.
- [x] #5 Participant application rendering and validation use the event's current field configuration.
- [x] #6 Existing tests are updated or added for the field configuration rules, including event settings persistence and participant application validation.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update canonical docs for event application field configuration: fixed field list, visible/required semantics, locked name fields, editable-after-open behavior, and current-config submission validation.
2. Extend event persistence and API serialization with application field visibility alongside existing requirement flags, preserving direct canonical columns rather than runtime compatibility shims.
3. Update event create/update schemas, create/update routes, and serializers so event admins can save visible/required field settings and invalid `required && !visible` combinations are rejected.
4. Replace the admin settings requirement checkbox list with an application-fields table showing field name, Visible, and Required, with locked mandatory rows for first/family name and required disabled when hidden.
5. Update participant registration helpers, form schema, and registration UI so only currently visible fields render and only currently required visible fields block submission.
6. Update server application submission validation so hidden optional application fields are ignored in stored registration details and required visible fields are enforced.
7. Add migrations and focused unit/integration tests for field config serialization, event update persistence, participant rendering/validation, and application submission validation.
8. Run docs/code validation, then commit and push only TASK-359 changes together with its Backlog task file.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Discovery: current implementation stores application/profile requirements as event booleans (`requireXProfile`, `requireWhyThisEvent`, etc.). Admin settings renders these as flat checkboxes in `app/components/admin/EventConfigForm.vue`. Participant registration derives profile-field visibility in `app/domains/applications/participant-application.ts`; X/LinkedIn/GitHub are always visible, ChatGPT/OpenAI/Luma are visible only when required, and why/proof/team intent/in-person commitment are handled separately. Server submission validation in `server/domains/applications/index.ts` enforces the same requirement booleans. This feature therefore needs schema/API/client/docs/test changes rather than a UI-only table. Existing unrelated worktree changes are present in `OPERATOR.md`, `server/domains/events/index.ts`, and several tests; isolate any edits and preserve those changes.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented per-event application field configuration with visible/required flags, locked first/family name semantics, event-type defaults, API and database persistence, participant form rendering/validation, server submission enforcement, canonical docs, and focused tests. Validation passed: bun run lint, bun run typecheck, bun run test:unit, bun run test:integration, and bun run test:bdd. Commit/push still requires isolating TASK-359 hunks from concurrent TASK-358/BDD worktree edits in overlapping files.
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
