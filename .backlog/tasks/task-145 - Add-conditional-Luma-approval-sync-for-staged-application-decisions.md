---
id: TASK-145
title: Add conditional Luma approval sync for staged application decisions
status: Done
assignee:
  - Codex
created_date: '2026-04-01 18:44'
updated_date: '2026-04-01 19:44'
labels: []
dependencies: []
references:
  - 'https://luma.com/user/bpirvu'
documentation:
  - docs/README.md
  - docs/domain-model.md
  - docs/api-surface.md
  - 'https://docs.luma.com/reference/post_v1-event-update-guest-status'
  - 'https://docs.luma.com/reference/get_v1-event-get-guests'
  - 'https://docs.luma.com/reference/get_v1-calendar-lookup-event'
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When a hackathon admin applies staged application decisions, the platform should also attempt to mirror the final approval or rejection to the linked Luma event. This sync must only run for hackathons that have a Luma event URL configured and require a Luma username for registration. Luma sync failures must not block the canonical application decision or participant email flow, but admins need a clear warning so they can complete the Luma action manually when needed. The implementation should use the existing queued side-effect pattern and resolve Luma users from the public profile username path already collected on platform accounts.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Applying staged decisions enqueues Luma sync work only when the hackathon has both a Luma event URL and required Luma profile enabled, while canonical approval or rejection and review emails continue to complete even if Luma sync is unavailable.
- [x] #2 The per-application record persists Luma sync state so admins can distinguish not_synced, approval synced, rejection synced, approval failed, and rejection failed outcomes for a hackathon participant.
- [x] #3 The Luma sync worker resolves the stored Luma username to the public Luma user API id, matches the event guest from the event guest list, updates the guest status to approved or declined, records the resulting sync state on the application record, and retries only retryable failures.
- [x] #4 The admin participant views surface a clear warning for approved or rejected applications whose Luma sync state indicates failed manual follow-up.
- [x] #5 Runtime configuration, queue bindings, database schema changes, automated tests, and canonical docs cover the Luma sync path and the conditional enablement rules.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a persisted Luma sync status field on the application record, with a database migration and schema updates that support queued sync lifecycle tracking for each user-hackathon application.
2. Add a dedicated Luma queue integration alongside the existing application review email queue: runtime config, local binding middleware, Nitro queue plugin, Cloudflare queue bindings, and a queue utility module with enqueue and batch processing helpers.
3. Implement a Luma sync client that resolves a configured event from the hackathon Luma URL, resolves a stored Luma username through the public profile page to a Luma user api_id, lists event guests, matches by guest.user_id, and updates guest status to approved or declined with retry classification for transport, 429, and 5xx failures.
4. Update the staged decision apply route to set the application Luma sync status to not_synced when Luma sync is enabled, enqueue the Luma job, degrade to a failed state when enqueue is skipped or fails, and capture outcomes in audit logs without blocking the canonical decision flow.
5. Update the Luma queue worker to write approve_synced, reject_synced, approve_failed, or reject_failed back onto the application record based on the final sync outcome.
6. Update the admin operations UI and approved or rejected participant listings to show clear warning state when an application has failed Luma sync.
7. Add or update unit and integration coverage for the schema change, queue utilities, middleware binding, staged decision route, worker persistence, and admin warnings; update canonical docs and runtime docs to describe the conditional sync behavior and required Luma configuration.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented a dedicated Luma sync queue wired off apply-staged-decisions, gated by requireLumaProfile plus lumaEventUrl, with per-application lumaSyncStatus persistence.

The worker resolves lumaUsername through the public Luma profile page, looks up the event API id, matches the guest by guest.user_id, and updates guest status through the official Luma API.

Admin approved and rejected participant views now surface failed Luma sync warnings from application state.

Validation passed locally: bun run lint, bun run typecheck, bun run test:unit, and a targeted integration run for tests/integration/server/api/application-routes.test.ts.

Residual risk: username to user id resolution depends on Luma's public profile HTML embedding __NEXT_DATA__. If Luma changes that page shape, syncs will move to approve_failed or reject_failed and require manual follow-up until the resolver is updated.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented conditional Luma application decision sync for hackathons that require a Luma username and define a Luma event URL. Added a `luma_sync_status` field plus migration and schema wiring so applications persist `not_synced`, `approve_synced`, `reject_synced`, `approve_failed`, and `reject_failed`. Submission initializes `not_synced` only for Luma-enabled hackathons, and applying staged decisions now enqueues a dedicated Luma queue job alongside the existing review email queue while degrading to a failure state if the Luma enqueue cannot be performed.

Added a new Luma queue utility and Nitro queue plugin that resolve a user from the stored Luma username through the public profile page, resolve the event and guest through the official Luma API, and update guest approval status with retry handling for transport, 429, and 5xx failures. The client now sends a browser-style `User-Agent` because live probes showed Luma's Cloudflare edge blocks the default request signature with Error 1010 before the API layer is reached.

Updated admin participant views to surface failed Luma sync warnings, and updated runtime/config docs plus canonical docs to describe the conditional sync behavior and configuration. Validation passed locally with `bun run lint`, `bun run typecheck`, `bun run test:unit`, and a targeted integration run for `tests/integration/server/api/application-routes.test.ts`. Residual risk: username resolution still depends on Luma's public profile HTML embedding `__NEXT_DATA__`; if that vendor page shape changes, applications will move to `approve_failed` or `reject_failed` and require manual follow-up.
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
