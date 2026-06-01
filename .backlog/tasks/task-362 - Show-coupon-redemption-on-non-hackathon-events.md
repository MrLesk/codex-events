---
id: TASK-362
title: Show event credits for admins and approved participants with inventory
status: Done
assignee:
  - Codex
created_date: '2026-06-01 19:20'
updated_date: '2026-06-01 19:41'
labels:
  - bug
  - frontend
dependencies: []
priority: medium
ordinal: 60000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Event credits should be available across event types. Event admins can manage the Credits tab for any event they administer. Approved participants see the Credits tab only when that event has uploaded credit inventory to claim.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Event admins can see and manage the Credits tab for hackathon, meetup, and build events.
- [x] #2 Approved participants see the Credits tab only when their event has uploaded credit inventory.
- [x] #3 Approved participants do not see the Credits tab for events with no uploaded credit inventory.
- [x] #4 Existing hackathon credit behavior remains unchanged.
- [x] #5 Canonical docs describe event credits as available across event types with admin and approved-participant visibility rules.
- [x] #6 Automated validation covers tab visibility and server credit access for non-hackathon events.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update canonical docs to remove the Hackathon-only credit restriction and describe admin/approved-participant visibility.
2. Remove `assertCompetitionEvent` from event credit server routes and access helpers while keeping admin and approved-application authorization.
3. Update the account event workspace tab model to show Credits for all admins and for approved participants only when credit inventory exists.
4. Load participant credit inventory in the account event page so tab access can be resolved before rendering.
5. Add/update focused unit and integration tests for non-Hackathon credit access and tab visibility.
6. Run required validation, then finalize TASK-362 and commit/push only related files.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Discovery: event credits are currently gated as Hackathon-only in both the account workspace tab model and the server credit access guards. Canonical docs also state that Meetups and Builds do not expose credits (`docs/domain-model.md`, `docs/permissions-matrix.md`, `docs/api-surface.md`, `docs/testing-strategy.md`). Expanding redemption/coupon credits to non-Hackathon events requires a product/doc decision before implementation.

Implemented: removed the Hackathon-only guard from event credit APIs, updated account workspace tab visibility to show Credits for admins across event types and for approved participants only when uploaded inventory exists, updated canonical docs, and added unit/integration coverage for registration-only event credits. Validation passed: focused account tab unit test, focused event credit integration test, `bun run lint`, `bun run typecheck`, `bun run test:unit`, `bun run test:integration`, and `bun run test:bdd`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Summary:
- Event credits now apply across event types: the server credit view, claim, management, update, and import routes no longer require `eventType = hackathon`.
- The account event workspace shows the Credits tab for every event admin, and shows it to approved participants only when the event has uploaded credit inventory.
- Canonical docs now describe event credits as a general event capability rather than a Hackathon-only workflow.

Tests:
- Focused account workspace tab unit test passed.
- Focused event credit route integration test passed.
- `bun run lint`, `bun run typecheck`, `bun run test:unit`, `bun run test:integration`, and `bun run test:bdd` passed.

Risks and follow-ups:
- No known test gaps remain for this change.
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
