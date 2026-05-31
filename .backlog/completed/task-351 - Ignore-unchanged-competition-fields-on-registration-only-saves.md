---
id: TASK-351
title: Ignore unchanged competition fields on registration-only saves
status: Done
assignee: []
created_date: '2026-05-31 19:50'
updated_date: '2026-05-31 19:55'
labels:
  - bug
dependencies: []
modified_files:
  - server/domains/events/index.ts
  - 'server/api/events/[eventId]/index.patch.ts'
  - tests/unit/server/domains/events/index.test.ts
  - tests/integration/server/api/event-routes.test.ts
priority: medium
ordinal: 53000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make registration-only event settings saves resilient when a full-form PATCH includes hidden competition-only fields without changing them, so participant-limit edits are not blocked by the competition-configuration guard.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A registration-only event update can save participantsLimit when the request also includes unchanged/default competition-only fields from the settings form.
- [x] #2 A registration-only event update still rejects actual competition configuration changes such as non-empty tracks or changed team/judging/submission fields.
- [x] #3 The patch route does not replace tracks for registration-only events.
- [x] #4 Validation passes for the changed code.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated event update handling so registration-only events ignore unchanged hidden competition-only fields during settings saves, while still rejecting actual competition configuration changes. The PATCH route now only validates/replaces tracks for hackathon events, so stale full-form clients cannot clear non-hackathon tracks or trip the competition guard while saving participantsLimit. Added unit and integration coverage for participant-limit saves with hidden defaults, rejection of changed competition fields, and track preservation on registration-only events. Validation: `bun run lint`, `bun run typecheck`, `bun run test:unit`, `bun run test:integration`, and `git diff --check` passed. `bun run test:bdd` was attempted but failed during fixture reset before browser specs because existing BDD fixtures insert judge criterion scores above the current 1..5 CHECK constraint.
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
