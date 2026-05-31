---
id: TASK-343
title: Clarify event-scoped organizer admin boundaries
status: Done
assignee:
  - Codex
created_date: '2026-05-31 17:37'
updated_date: '2026-05-31 17:40'
labels:
  - auth
  - events
dependencies: []
modified_files:
  - docs/domain-model.md
  - docs/permissions-matrix.md
  - docs/schema-outline.md
  - docs/api-surface.md
  - tests/integration/server/api/application-routes.test.ts
priority: medium
ordinal: 46000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make the event organizer/admin boundary explicit: event-organizer status grants event creation only; event admin access is scoped to events the user created or was assigned to; organizers/admins do not receive admin visibility into unrelated events; and a person who manages one event can still register as a participant for another event where they do not hold event-admin access.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Canonical docs explicitly state that event organizers only become event admins for events they create or events where they are assigned event-admin access.
- [x] #2 Canonical docs explicitly state that event admins do not receive admin visibility into unrelated events by virtue of being organizers or admins elsewhere.
- [x] #3 Application or authorization coverage verifies that an event organizer/admin for one event can submit a participant application to a different event where they have no admin role.
- [x] #4 Validation appropriate to the modified files passes before commit.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Tighten the canonical docs where the role model is defined: domain model, permissions matrix, schema outline, and API surface. Keep this as current product truth, not implementation history.
2. Add focused integration coverage to the application route suite proving that an event organizer/admin for one event can submit a participant application to a different event where they have no event-admin assignment.
3. Run targeted integration validation for the touched application route suite, then the required code validations (`bun run lint`, `bun run typecheck`, `bun run test:unit`) unless a command is blocked.
4. Update TASK-343 acceptance criteria and final summary, then commit and push the docs, test, and task file together.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented the scoped organizer/admin clarification in canonical docs and added integration coverage in `tests/integration/server/api/application-routes.test.ts`. The new test verifies an organizer with event-admin access to one event cannot list another event's applications through the admin read path, but can submit a participant application to that unrelated event.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated the canonical event role model to make event-organizer access creation-only and event-admin access event-scoped. The docs now explicitly state that organizers/admins only manage events they created or were assigned to, do not see unrelated event admin detail, and can register as participants for other events.

Added integration coverage for the cross-event participant case: an event organizer with admin access to a different event receives the participant-visibility authorization error when trying to list another event's applications, but can submit their own participant application to that event.

Validation passed: `bun run test:integration -- tests/integration/server/api/application-routes.test.ts`, `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `git diff --check` for the touched files. No follow-up task is required.
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
