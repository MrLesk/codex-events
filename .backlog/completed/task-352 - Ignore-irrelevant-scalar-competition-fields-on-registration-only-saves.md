---
id: TASK-352
title: Ignore irrelevant scalar competition fields on registration-only saves
status: Done
assignee: []
created_date: '2026-05-31 20:07'
updated_date: '2026-05-31 20:09'
labels:
  - bug
dependencies: []
modified_files:
  - server/domains/events/index.ts
  - tests/unit/server/domains/events/index.test.ts
  - tests/integration/server/api/event-routes.test.ts
priority: medium
ordinal: 53000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Registration-only settings saves can still be sent from stale/full-form clients with scalar competition fields that differ from stored meetup defaults. Treat those fields as irrelevant for non-hackathon event updates, while preserving the guard for actual track replacement and keeping the client payload shaped by event type.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Saving participantsLimit for a meetup succeeds even when the request includes scalar competition defaults that differ from the stored row.
- [x] #2 Non-hackathon event updates still do not persist scalar competition fields.
- [x] #3 Non-hackathon event updates still reject non-empty track replacement.
- [x] #4 Validation passes for the changed code.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated non-hackathon event update normalization so scalar competition-only fields are treated as irrelevant no-ops instead of causing the `hackathon_event_required` guard to fail. The guard still rejects non-empty track replacement for registration-only events, and stripped scalar competition fields are not persisted. Added unit and integration coverage matching stale/full-form meetup saves where `participantsLimit` is saved while hidden scalar defaults differ from the stored row. Validation: `bun run lint`, `bun run typecheck`, `bun run test:unit`, `bun run test:integration`, and `git diff --check` passed. `bun run test:bdd` was attempted and still fails during fixture reset because existing BDD fixture SQL inserts judge criterion scores above the current 1..5 CHECK constraint before browser specs run.
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
