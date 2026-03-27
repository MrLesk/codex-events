---
id: TASK-44.1
title: Queue application decision email delivery with retries/backoff
status: Done
assignee: []
created_date: '2026-03-27 20:02'
updated_date: '2026-03-27 20:09'
labels: []
dependencies: []
parent_task_id: TASK-44
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Move participant application decision email delivery from inline request handling to a Cloudflare Queue consumer so decision APIs enqueue work and delivery is retried with configured backoff.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Application approve/reject routes enqueue decision email work to a configured queue instead of calling provider delivery inline
- [x] #2 Queue consumer processes enqueued decision-email messages and invokes Resend delivery using existing decision template logic
- [x] #3 Queue consumer retries provider-failure messages and acknowledges non-retryable messages to avoid poison loops
- [x] #4 Wrangler and runtime configuration define queue producer/consumer bindings with retry/backoff settings
- [x] #5 Unit and integration tests cover enqueue behavior, consumer processing, and retry/ack behavior for failure paths
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented queue-backed application decision email delivery with retry/backoff handling.

What shipped:
- Added Cloudflare Queue message schema and producer/consumer utility layer in `server/utils/application-review-email-queue.ts`.
- Switched application approve/reject routes to enqueue decision-email messages and record enqueue outcomes in audit logs via `user_application.review_email_enqueued`.
- Added Nitro Cloudflare queue hook plugin (`server/plugins/application-review-email-queue.ts`) to consume queue batches and process decision-email delivery.
- Added retry/ack logic: retry for retryable provider/transport failures, ack for sent/skipped/non-retryable failures and invalid messages.
- Added queue runtime config (`applicationReviewEmails`) and environment defaults in `nuxt.config.ts` and `.env.example`.
- Added Wrangler queue producer/consumer configuration with retries/backoff in `wrangler.jsonc`.
- Updated local platform middleware to expose queue producer binding from local platform proxy when available.
- Updated docs to reflect enqueue-based behavior and queue/runtime configuration (`docs/api-surface.md`, `docs/domain-model.md`, `README.md`).
- Added/updated tests for queue utilities and API enqueue behavior.

Validation:
- `bun run test:unit` passed.
- `bun run test:integration` passed.
- `bun run typecheck` passed.
- `bun run lint` completed with existing unrelated `vue/no-v-html` warnings and no new errors.

Risks / follow-up:
- Queue consumer currently records enqueue outcomes in audit logs from review APIs; if full delivery-attempt observability per message is required, add explicit consumer-side audit writes for delivery outcomes.
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
