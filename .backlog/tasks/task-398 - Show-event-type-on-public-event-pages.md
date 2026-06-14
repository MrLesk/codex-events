---
id: TASK-398
title: Show event type on public event pages
status: Done
assignee:
  - '@codex'
created_date: '2026-06-14 15:00'
updated_date: '2026-06-14 15:10'
labels: []
dependencies: []
ordinal: 77000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Visitors should be able to see what kind of event they are viewing from both the public events listing and the public event detail page.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The public events homepage/listing shows a user-facing event type for each event.
- [x] #2 The public event detail page shows the same user-facing event type in the page summary/header area.
- [x] #3 The change uses existing public event UI conventions and does not expose raw internal enum values.
- [x] #4 Required validation passes for the touched code.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reuse the existing public event type formatter instead of rendering raw eventType values.
2. Add the event type to public event cards on the homepage using existing badge/meta styling.
3. Add the event type to the public event detail header/summary area.
4. Run required validation and finalize the Backlog task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented the public event card and public event detail event-type labels with existing presentation formatting; added BDD coverage for both visible surfaces.

Validation results:
- Passed: bun run lint
- Passed: bun run test:unit (109 files, 731 tests)
- Passed: bun run test:integration (22 files, 335 tests)
- Passed: targeted public event-discovery BDD (4 scenarios)
- Blocked in current worktree: bun run typecheck fails in server/api/events/[eventId]/applications/index.post.ts on an unrelated implicit-any track parameter from concurrent local changes.
- Blocked in full suite: bun run test:bdd has unrelated authenticated judge/prize fixture failures; the public event-discovery scenarios for this task passed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Displayed formatted event type labels on the public event card and public event detail header, then covered both surfaces in public event-discovery BDD.
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
