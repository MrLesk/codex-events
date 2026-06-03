---
id: TASK-364
title: Add AI Knowledge registration field
status: Done
assignee:
  - '@Codex'
created_date: '2026-06-03 19:30'
updated_date: '2026-06-03 19:53'
labels:
  - events
  - applications
  - admin
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/schema-outline.md
  - docs/api-surface.md
  - docs/testing-strategy.md
modified_files:
  - app/components/account/events/AccountEventAdminOperationsPanel.vue
  - app/components/account/events/AccountEventParticipantVisibilityPanel.vue
  - app/components/account/events/AccountEventParticipantsPanel.vue
  - app/components/admin/EventConfigApplicationFieldsTable.vue
  - app/components/applications/AdminApplicationsReviewPanel.vue
  - app/components/applications/ParticipantApplicationRegistrationPanel.vue
  - app/composables/useParticipantApplication.ts
  - app/domains/applications/admin-application-review.ts
  - app/domains/applications/participant-application-form.ts
  - app/domains/applications/participant-application.ts
  - app/domains/events/admin-event.ts
  - app/domains/events/presentation.ts
  - app/domains/events/records.ts
  - 'app/pages/events/[slug]/register.vue'
  - docs/api-surface.md
  - docs/domain-model.md
  - docs/schema-outline.md
  - drizzle/0054_ai_knowledge_registration_field.sql
  - nuxt.config.ts
  - 'server/api/events/[eventId]/applications/index.post.ts'
  - server/database/schema.ts
  - server/domains/applications/index.ts
  - server/domains/events/index.ts
  - shared/domains/applications/ai-knowledge.ts
  - tests/integration/server/api/application-routes.test.ts
  - tests/unit/app/domains/admin-domain-modules.test.ts
  - tests/unit/app/domains/applications/admin-application-review.test.ts
  - tests/unit/app/domains/applications/participant-application-form.test.ts
  - tests/unit/app/domains/applications/participant-application.test.ts
  - tests/unit/app/domains/events/admin-event-schema.test.ts
  - tests/unit/app/domains/judging/workspace.test.ts
  - tests/unit/server/database/schema.test.ts
  - tests/unit/server/domains/applications/index.test.ts
  - tests/unit/server/domains/events/index.test.ts
  - vitest.config.ts
  - vitest.integration.config.ts
priority: high
ordinal: 62000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add an optional event-scoped AI Knowledge registration field. Event admins can enable or hide it from the existing application-fields settings table. When enabled, participants self-select Beginner, Intermediate, or Advanced during registration, and participant-visibility/admin views display and filter by those levels. The field is event-specific registration detail data, not account profile data, and remains optional.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Event configuration supports an `applicationAiKnowledgeVisible` flag, persisted in the database, serialized through public and caller-visible event APIs, and editable from existing event settings.
- [x] #2 Participant registration shows an optional AI Knowledge dropdown only when the event enables the field, with the requested placeholder and three level descriptions.
- [x] #3 Application submission persists `aiKnowledgeLevel` as `""`, `beginner`, `intermediate`, or `advanced`; hidden submitted values are ignored and visible invalid values are rejected.
- [x] #4 Admin participant views display AI Knowledge when enabled and provide an All/Beginner/Intermediate/Advanced filter that preserves grouped-applicant behavior and hides unrelated teammate hints.
- [x] #5 Canonical docs and focused tests cover the new field, validation, serialization, and admin filtering behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add persistence and contracts: create a new Drizzle migration for `events.application_ai_knowledge_visible`, update `server/database/schema.ts`, event create/update validation, event serializers, and client event/public event types with `applicationAiKnowledgeVisible` defaulting false.
2. Add registration detail model: define AI Knowledge level values/labels in the participant application domain, extend `ParticipantRegistrationDetails`, parser defaults, participant form schema, server submit schema, and `serializeRegistrationDetailsJson` so hidden values store `""`, unselected visible values store `""`, valid selected values store `beginner|intermediate|advanced`, and invalid visible values fail.
3. Update registration UI: add `aiKnowledgeLevel` state to the public registration page and existing composable wiring, pass it into `ParticipantApplicationRegistrationPanel`, and render an optional `AppSelect` with the requested label/options only when enabled.
4. Update admin UI: add an AI Knowledge row to `EventConfigApplicationFieldsTable.vue` with visible-only behavior, display AI Knowledge metadata on participant cards when the event enables it, pass the event flag through admin/staff participant panels, and add an `AppSelect` level filter that preserves existing grouped-applicant filtering.
5. Update canonical docs and tests: document the field in domain/schema/API docs, add focused unit coverage for event config defaults/serialization, participant form and server registration serialization, parser labels, and admin filtering.
6. Validate with `bun run lint`, `bun run typecheck`, and `bun run test:unit`; run broader tests if the final diff shows integration or BDD fixture changes require them; then update TASK-364, commit with `TASK-364 - Add AI Knowledge registration field`, and push `main`.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented an event-scoped AI Knowledge registration field. Events now persist and serialize `applicationAiKnowledgeVisible`, admins can show or hide the field from application-field settings, participants see the optional dropdown only when enabled, and submissions persist `aiKnowledgeLevel` as an empty string or one of the three supported levels while rejecting invalid visible values. Admin participant review surfaces now display AI Knowledge when enabled and include an All/Beginner/Intermediate/Advanced filter that keeps grouped applicants coherent and removes unrelated pending teammate hints. Canonical domain, schema, and API docs plus focused unit and integration coverage were updated. Validation passed with `git diff --check`, `bun run lint`, `bun run typecheck`, `bun run test:unit`, `bun run test:integration`, and `bun run test:bdd`. No known follow-ups.
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
