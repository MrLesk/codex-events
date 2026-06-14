---
id: TASK-406
title: Block post-event build track switching
status: Done
assignee:
  - '@codex'
created_date: '2026-06-14 18:34'
updated_date: '2026-06-14 18:43'
labels: []
dependencies: []
modified_files:
  - 'server/api/events/[eventId]/applications/me/actions/select-track.post.ts'
  - 'app/pages/account/events/[slug]/index.vue'
  - tests/integration/server/api/application-routes.test.ts
  - docs/domain-model.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
ordinal: 85000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Participants must not be able to change their build event track after the event is complete because certificates display the track they participated in. Track changes remain allowed while the event is still active.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A participant can change track before the build event reaches a completed state
- [x] #2 A participant cannot change track after the build event is completed
- [x] #3 Tests cover the completed-event restriction at the server or domain boundary
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Trace participant track selection from UI/API to persistence and confirm the canonical completed state.
2. Add the completed-event guard at the server boundary that owns participant track changes.
3. Mirror the guard in the account workspace track chooser.
4. Add integration coverage for active Build track switching and completed-event rejection.
5. Run required validation and finalize the task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented the completed-event guard in the participant select-track API and hid participant track-selection controls in the account workspace when the event is completed. Updated domain, permission, and API docs to make the completed-event limit canonical.

Validation passed: targeted application-routes integration test, bun run lint, bun run typecheck, bun run test:unit, bun run test:integration, bun run test:bdd on retry. The first BDD attempt timed out during Auth0 session bootstrap before scenarios ran; the retry completed successfully.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Participants can still select a Build track before completion, but the select-track API now rejects completed events and preserves the previous selection. The account workspace no longer shows participant track-selection actions after completion, and canonical docs describe the new lifecycle limit.
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
