---
id: TASK-211
title: Sync Luma attendee check-ins into hackathon attendance
status: Done
assignee: []
created_date: '2026-04-13 19:19'
updated_date: '2026-04-13 19:43'
labels: []
dependencies:
  - TASK-212
  - TASK-213
  - TASK-214
documentation:
  - docs/domain-model.md
  - docs/api-surface.md
  - docs/schema-outline.md
  - docs/testing-strategy.md
  - 'https://docs.lu.ma/reference/post_v1-webhooks-create'
  - 'https://docs.lu.ma/reference/webhook_guest_updated'
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add canonical hackathon attendance tracking based on Luma check-ins so the platform can distinguish approved participants from participants who actually arrived. Attendance is sticky in this version: once a participant is marked attended from Luma, later Luma uncheck changes are ignored. A Luma event API ID must map to at most one hackathon. Valid signed webhook deliveries for events or participants not configured in the current environment must still return 200 with no mutation so shared Luma calendars can send to both dev and production safely.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The platform can receive signed Luma guest check-in webhooks and mark matching hackathon participants as attended exactly once.
- [x] #2 Valid signed webhook deliveries for unmapped events or participants are acknowledged with HTTP 200 and do not fail the sender.
- [x] #3 The dev and production environments can reconcile the required Luma webhooks and manage webhook signing secrets through repository-owned automation.
- [x] #4 Hackathon admins can see participant attendance from the existing admin participant review surface.
- [x] #5 Canonical docs and automated validation are updated for the new attendance behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Deliver the backend attendance model and signed inbound Luma webhook handling in TASK-212, including sticky `checkedInAt`, unique hackathon-to-Luma-event mapping, canonical docs, and backend test coverage.
2. Deliver repository-owned dev and production webhook reconciliation in TASK-213, including exact-URL managed webhook drift detection, signing secret capture, workflow integration, and operator/developer documentation.
3. Deliver the minimal admin attendance UI in TASK-214 inside the existing approved-participants workflow, using the backend `checkedInAt` contract and adding summary plus checked-in-only filtering.
4. Finalize the parent task only after all three subtasks are validated together in the shared worktree.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed the Luma attendance feature across backend, deployment automation, and admin UI. The platform now receives signed Luma `guest.updated` check-in webhooks, records sticky attendance on approved participant applications via `checkedInAt`, acknowledges valid signed deliveries for unmapped events or participants with HTTP 200, reconciles the managed dev and production Luma webhooks automatically during deployment, uploads the derived `NUXT_LUMA_WEBHOOK_SECRET` to the Worker, and exposes attendance in the existing admin approved-participants workflow with summary and checked-in-only filtering. Canonical docs, schema, tests, and deployment documentation were updated together. Integrated validation passed locally with `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bun run test:integration`. Residual follow-up to consider separately: add operational observability for webhook delivery metrics or admin attendance exports if the team needs them later.
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
