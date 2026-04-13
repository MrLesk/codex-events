---
id: TASK-212
title: Persist hackathon attendance from Luma check-ins
status: Done
assignee: []
created_date: '2026-04-13 19:19'
updated_date: '2026-04-13 19:43'
labels: []
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/api-surface.md
  - docs/schema-outline.md
  - docs/testing-strategy.md
  - 'https://docs.lu.ma/reference/webhook_guest_updated'
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the canonical backend attendance model and inbound Luma webhook ingestion for participant attendance. Attendance is per user application, not global to the user, and the first successful Luma check-in should stick. Later Luma uncheck changes are ignored in this version. A valid signed webhook for an event or participant unknown to the current environment must still return success without mutating local data.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The canonical model stores hackathon attendance on the participant's hackathon application and enforces unique Luma event mapping per hackathon.
- [x] #2 A public signed Luma webhook endpoint processes guest check-in updates, verifies authenticity, and marks matching participant attendance idempotently.
- [x] #3 Attendance remains set after the first successful check-in and is not cleared by later uncheck updates.
- [x] #4 Valid signed deliveries for unknown events or unmatched participants return HTTP 200 with no mutation, while invalid signatures are rejected.
- [x] #5 Unit and integration coverage verify successful attendance sync, duplicate deliveries, invalid signatures, unknown events, unmatched participants, and sticky attendance behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add the canonical attendance field and unique Luma event mapping in the backend model: add nullable `checkedInAt` to `user_applications`, add a unique index on non-null `hackathons.lumaEventApiId`, add the required Drizzle migration, and update backend serialization so application reads expose `checkedInAt`.
2. Add the inbound Luma attendance webhook surface: introduce `POST /api/public/luma/webhooks`, read the raw body, verify the signed request with `NUXT_LUMA_WEBHOOK_SECRET`, enforce a replay window, and acknowledge valid signed deliveries with HTTP 200 even when the event or participant does not map to this environment.
3. Implement attendance matching and mutation rules: process only `guest.updated` deliveries that carry a check-in timestamp, resolve the hackathon by `lumaEventApiId`, resolve the participant by `users.lumaEmail` within that hackathon, mutate only `approved` applications, keep attendance sticky by writing only when `checkedInAt` is null, and ignore uncheck or duplicate deliveries.
4. Record the first successful attendance sync in audit data with a system-originated `user_application` audit entry and include enough metadata for operations without coupling this task to webhook provisioning automation.
5. Add unit and integration coverage for schema, signature verification, successful attendance sync, duplicate deliveries, invalid signatures, unknown events, unmatched participants, and sticky attendance behavior, then run `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bun run test:integration`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Supervisor assigned worker planning. No code changes approved yet; waiting for plan review.

Live Luma API check before implementation confirmed guest records from `get-guests` expose both `email` and `user_email`, plus `checked_in_at`; stored event identifiers are `evt-*` values. I am using that evidence to keep the webhook payload parser flexible around guest email fields while matching hackathons by event API ID.

Implementation landed without widening scope: inbound attendance sync now uses a dedicated signed public webhook route and a separate `isHackathonLumaAttendanceSyncEnabled()` helper so outbound approval/rejection sync keeps its existing `requireLumaEmail` gate. Matching is case-insensitive on `users.lumaEmail`, non-approved applications acknowledge with no mutation, and ambiguous duplicate Luma-email matches in one hackathon also no-op rather than marking the wrong participant attended.

Validation completed locally: `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bun run test:integration` all passed after adding the attendance schema/migration, signed webhook handling, docs updates, and unit/integration coverage.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented the backend attendance model and inbound Luma webhook ingestion for hackathon attendance. Added sticky `checkedInAt` on `user_applications`, enforced unique non-null `hackathons.lumaEventApiId`, exposed `checkedInAt` through application serialization, introduced `POST /api/public/luma/webhooks` with signed raw-body verification using `NUXT_LUMA_WEBHOOK_SECRET`, and added focused Luma webhook utilities for signature verification, payload extraction, and guest-email fallback lookup. Matching is case-insensitive on `users.lumaEmail`, only `approved` applications are marked attended, duplicate or uncheck deliveries no-op, and valid signed deliveries for unknown events or unmatched participants return HTTP 200 with no mutation. Updated canonical docs and added schema, unit, and integration coverage for the new behavior. Validation passed locally with `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bun run test:integration`. Residual risk: webhook payload field paths were inferred from docs and live API evidence rather than a captured live delivery, so the parser is intentionally flexible and falls back to guest lookup when needed.
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
