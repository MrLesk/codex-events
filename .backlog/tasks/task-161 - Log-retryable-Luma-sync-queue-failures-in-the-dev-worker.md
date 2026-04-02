---
id: TASK-161
title: Log retryable Luma sync queue failures in the dev worker
status: Done
assignee: []
created_date: '2026-04-02 19:19'
updated_date: '2026-04-02 19:24'
labels:
  - debugging
  - luma
  - queues
dependencies: []
references:
  - >-
    /Users/alex/projects/codex-hackathons/server/utils/application-luma-sync-queue.ts
  - >-
    /Users/alex/projects/codex-hackathons/tests/unit/server/utils/application-luma-sync-queue.test.ts
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add safe diagnostic logging for retryable Luma sync queue failures so dev Worker tails show the exact retry reason and non-sensitive response details when Luma messages requeue without terminal audit rows.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Retryable Luma sync queue failures log a structured error with message id application id decision attempts and retry reason
- [x] #2 Logs do not include API keys or full raw secrets
- [x] #3 Unit coverage verifies the retry path still retries and emits diagnostic logging
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Observed on April 2 2026 that apply-staged-decisions returned 200 wrote fresh luma_sync_enqueued audit rows and triggered a Luma queue batch.

Observed a second dev-codex-hackathons-application-luma-sync batch about 120 seconds later matching queue retry delay which confirms the retryable path rather than silent ack or permanent failure.

Added structured retry logging in server/utils/application-luma-sync-queue.ts and updated unit coverage. Local validation passed with bun run lint bun run typecheck and bun run test:unit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added structured logging for retryable Luma sync queue failures so Wrangler tail shows the retry reason plus safe path/status/message details without exposing secrets. Updated unit coverage for the retry branch and confirmed local validation with bun run lint bun run typecheck and bun run test:unit.
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
