---
id: TASK-358
title: Make event application terms optional
status: Done
assignee:
  - Codex
created_date: '2026-05-31 21:02'
updated_date: '2026-05-31 23:58'
labels:
  - product
  - legal
  - applications
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/schema-outline.md
  - docs/api-surface.md
priority: medium
ordinal: 56000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Event registration should rely on accepted platform documents by default and require event-specific application terms only when an event has published current application terms. Prize/winner terms remain required for prize redemption where that workflow needs them.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Canonical docs describe event application terms as optional event-specific additions, with platform Privacy Policy and Platform Terms covering baseline registration.
- [x] #2 Application submission succeeds without event-specific application terms when all other event requirements are met.
- [x] #3 When current event application terms exist, application submission still requires accepting the exact current event terms version.
- [x] #4 Participant registration UI does not block or show an unavailable-terms warning for events without application terms.
- [x] #5 Relevant unit/integration tests cover both optional and required application terms behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update canonical docs so platform Privacy Policy and Platform Terms cover baseline registration, while event application terms are optional event-specific additions and winner terms stay tied to prize redemption.
2. Update application-domain server logic so missing current application terms does not block submission, while exact-version acceptance remains required when current application terms exist.
3. Update participant registration UI/domain helpers so the form only shows and validates the terms checkbox when event terms exist, and no unavailable-terms warning appears otherwise.
4. Add or adjust unit/integration tests for submission without event terms and submission with current event terms.
5. Run docs/code validation, update TASK-358 acceptance criteria and summary, then commit only this task's files plus its Backlog task file.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Discovery: application submission currently blocks in both `app/domains/applications/participant-application.ts` and `server/domains/applications/index.ts`; `server/api/events/[eventId]/applications/index.post.ts` always stores an accepted terms document; `user_applications.application_terms_document_id` and `application_terms_accepted_at` are non-null in schema/migrations. Existing unrelated local changes are present in `OPERATOR.md`, `server/domains/events/index.ts`, and related event tests; this task will avoid those files unless strictly necessary.

Implemented: application terms are now optional at the database, API, domain, and participant registration UI layers. When an event has current application terms, submissions still require exact-version acceptance; when it does not, the submission stores null terms acceptance fields and proceeds if other requirements pass. Canonical docs describe application terms as optional event-specific additions while winner terms remain tied to prize redemption.

Validation: `bun run lint`, `bun run typecheck`, `bun run test:unit`, `bun run test:integration`, `bun run test:bdd`, and `git diff --check` passed against a clean TASK-358 patch. BDD fixture drift was corrected where current constraints and workflows had moved ahead of the checked scenarios: judge scores now use the supported 1-5 scale, pitch-review scenarios complete pitch presentations first, and UI waits target current rendered states.
<!-- SECTION:NOTES:END -->

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
