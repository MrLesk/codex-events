---
id: TASK-159
title: Stop silent queue drops for Luma sync and recover stuck dev items
status: Done
assignee:
  - codex
created_date: '2026-04-02 18:44'
updated_date: '2026-04-02 18:50'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fix the Cloudflare queue handling so Luma sync jobs are not silently acknowledged when the consumer receives an unexpected queue name or otherwise cannot safely process the batch. Add a bounded recovery path for existing user applications that remain in not_synced after enqueue so dev recoveries do not require manual database edits.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Luma queue batches are not silently dropped when the consumer cannot safely process them due to queue-name mismatch or equivalent startup/runtime mismatch.
- [x] #2 A bounded recovery path re-enqueues stale Luma sync work for applications that remain in not_synced after prior enqueue attempts.
- [x] #3 Unit coverage verifies the queue mismatch behavior and the stale Luma recovery behavior.
- [x] #4 Documentation or operational notes in the task capture the intended recovery flow for future incidents.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update Luma queue batch handling so an unexpected queue name causes each message to be retried instead of silently skipped.
2. Add a bounded stale-Luma-sync recovery utility that finds recent applications still in not_synced and re-enqueues them when the app starts with queue bindings available.
3. Reuse existing queue/runtime helpers where possible and keep recovery scoped to Luma sync only.
4. Add unit tests for queue-name mismatch retry behavior and stale-item recovery behavior.
5. Run bun run lint, bun run typecheck, and bun run test:unit before handoff.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Investigated dev environment on 2026-04-02: two applications were enqueued for Luma sync but no completion or failure audit rows were written, which points to queue-consumer loss before terminal processing.

Implemented queue-routing guards in both Cloudflare queue plugins so they ignore the known sibling queue but retry truly unexpected queue batches instead of letting them complete silently.

Added bounded startup recovery for stale Luma sync items: on the first live request after isolate startup, the app re-enqueues up to 10 applications that remain not_synced beyond one retry window and writes user_application.luma_sync_recovery_enqueued audit rows while bumping updated_at to avoid immediate duplicate recovery.

Canonical docs and developer workflow docs remain unchanged because the fix does not alter the documented domain model or required setup. Validation passed with bun run lint, bun run typecheck, and bun run test:unit.

Residual operational risk: the current Cloudflare API token cannot inspect queue subscriptions or pause state, so if dev still shows not_synced after redeploy the next check is Cloudflare queue consumer wiring with a token that has queue-management permissions.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Patched the Cloudflare queue handling so the two queue consumers no longer rely on a silent skip for every queue-name mismatch. Each plugin now ignores the known sibling queue and retries truly unexpected batches, which prevents a misrouted or misconfigured batch from being acknowledged with no handler. Added a small shared queue-routing helper and unit coverage for the routing behavior.

Added bounded Luma startup recovery for stale not_synced applications. On the first live request after isolate startup, the app re-enqueues up to 10 stale Luma sync jobs that are older than one retry window, records a user_application.luma_sync_recovery_enqueued audit row, and updates updated_at so the same items are not immediately replayed again. Added unit coverage for stale-item recovery and the once-per-start scheduler.

Validation: bun run lint, bun run typecheck, bun run test:unit. Docs remain unchanged because the platform contract did not change. Remaining risk is operational: the current Cloudflare token cannot inspect queue subscriptions, so if dev still leaves applications at not_synced after redeploy the next step is to verify the queue consumer subscription or pause state with stronger Cloudflare queue permissions.
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
