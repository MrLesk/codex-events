---
id: TASK-365
title: Allow AI Knowledge registration field to be required
status: Done
assignee:
  - '@Codex'
created_date: '2026-06-03 22:52'
updated_date: '2026-06-03 23:02'
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
  - app/components/admin/EventConfigApplicationFieldsTable.vue
  - app/components/applications/ParticipantApplicationRegistrationPanel.vue
  - app/domains/applications/participant-application-form.ts
  - app/domains/events/admin-event.ts
  - app/domains/events/presentation.ts
  - app/domains/events/records.ts
  - app/pages/admin/events/new.vue
  - docs/api-surface.md
  - docs/domain-model.md
  - docs/schema-outline.md
  - drizzle/0055_require_ai_knowledge.sql
  - server/api/events/index.post.ts
  - server/database/schema.ts
  - server/domains/applications/index.ts
  - server/domains/events/index.ts
  - tests/integration/server/api/application-routes.test.ts
  - tests/integration/server/api/event-routes.test.ts
  - tests/unit/app/domains/admin-domain-modules.test.ts
  - tests/unit/app/domains/applications/participant-application-form.test.ts
  - tests/unit/app/domains/events/admin-event-schema.test.ts
  - tests/unit/app/domains/judging/workspace.test.ts
  - tests/unit/server/database/schema.test.ts
  - tests/unit/server/domains/applications/index.test.ts
  - tests/unit/server/domains/events/index.test.ts
priority: high
ordinal: 62000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Allow event admins to mark the AI Knowledge registration field as required from the existing application-fields settings table. The field remains optional by default, meaning the required checkbox starts unchecked, but when visible and required participants must select Beginner, Intermediate, or Advanced before submitting.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Event configuration supports a `requireAiKnowledge` flag, persisted in the database, defaulting to false, serialized through event APIs, and rejected when required while hidden.
- [x] #2 The admin application-fields table shows a normal required checkbox for AI Knowledge instead of static Optional text, with the required checkbox unchecked by default.
- [x] #3 Participant registration validation requires an AI Knowledge selection only when the event shows and requires the field.
- [x] #4 Server application submission rejects visible required AI Knowledge submissions with no selected level, rejects invalid visible values, and ignores hidden submitted values.
- [x] #5 Canonical docs and focused tests cover the new required flag, default behavior, admin configuration, participant validation, and server serialization.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add persistence and contracts: add a Drizzle migration for `events.require_ai_knowledge`, update `server/database/schema.ts`, event defaults, create/update schemas, serializers, and client event/config types with `requireAiKnowledge` defaulting false.
2. Update admin configuration: give the AI Knowledge row `requiredKey: 'requireAiKnowledge'` so the existing required checkbox renders and follows the existing hidden-field rule.
3. Update participant validation and submission serialization: pass `requireAiKnowledge` into the registration panel/schema, require a non-empty valid AI Knowledge value only when visible and required, and keep hidden submitted values ignored.
4. Update canonical docs and focused tests for defaults, hidden-required rejection, participant form validation, and server serialization.
5. Run `git diff --check`, `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bun run test:integration`; run BDD if the changed browser workflow needs it after the final diff.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented `requireAiKnowledge` as the required flag for the AI Knowledge registration field. The admin application-fields table now renders the normal required checkbox for AI Knowledge, defaulting unchecked. Event create/update schemas, serializers, public/caller-visible types, create-event UI payloads, and database schema/migration now carry `require_ai_knowledge`. Participant registration validation and server application serialization require a selected AI Knowledge level only when the field is visible and required; hidden submitted values are still ignored and invalid visible values are still rejected. Canonical docs and focused unit/integration coverage were updated. Validation passed with `git diff --check`, `bun run lint`, `bun run typecheck`, `bun run test:unit`, `bun run test:integration`, and `bun run test:bdd`. No known follow-ups.
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
