---
id: TASK-420.7
title: Send coupon receipts after simplified claims
status: Done
assignee:
  - '@codex'
created_date: '2026-07-15 22:09'
updated_date: '2026-07-15 22:17'
labels: []
dependencies: []
documentation:
  - docs/lifecycle-and-state-machines.md
  - docs/testing-strategy.md
modified_files:
  - 'server/api/events/slug/[slug]/simplified-claim/actions/redeem.post.ts'
  - server/domains/applications/review-email-queue.ts
  - server/domains/applications/review-emails.ts
  - tests/unit/server/domains/applications/review-emails.test.ts
  - tests/unit/server/domains/applications/review-email-queue.test.ts
  - tests/integration/server/api/simplified-claiming-routes.test.ts
  - docs/api-surface.md
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/testing-strategy.md
parent_task_id: TASK-420
priority: high
type: enhancement
ordinal: 106000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Participants who claim a coupon through simplified attendee claiming currently receive an application-approval email, which does not confirm the redemption or preserve the coupon link. Send a one-time coupon receipt to the participant's account email after the first successful claim instead.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Every first successful simplified coupon claim enqueues one receipt for absent, submitted, and already-approved participants.
- [x] #2 The receipt names the event, confirms the coupon claim, and includes the exact HTTPS coupon URL in both text and HTML content.
- [x] #3 Simplified claims do not send application-approval email content, while ordinary application approval and rejection emails remain unchanged.
- [x] #4 Repeated and concurrent idempotent claim responses do not enqueue duplicate receipts.
- [x] #5 Canonical lifecycle and testing documentation describes the receipt behavior, and required validation passes.
<!-- AC:END -->

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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend the existing queued participant-notification payload and email renderer with a simplified-claim receipt variant while preserving ordinary review messages.
2. Enqueue the receipt after every newly assigned coupon, keep approval audit semantics separate, and record a receipt-specific enqueue audit without coupon URLs.
3. Add unit and integration coverage for receipt content, all eligible application states, and idempotent/concurrent delivery.
4. Update canonical lifecycle/testing docs, run targeted and full validation, then finalize, commit, and push the isolated change.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implementation uses the existing durable application-review email queue as the configured participant-notification transport, adding a distinct `simplified_claim_receipt` message while leaving the ordinary application-review message shape unchanged. This avoids inline email delivery and preserves any in-flight review messages.

The receipt is queued only after the request proves it assigned the coupon with its unique claim timestamp. It is sent for absent, submitted, and already-approved applications; idempotent and losing concurrent requests return before enqueue. The receipt audit stores event/user/enqueue status but not the coupon URL.

Targeted validation passed: the two email unit suites (12 tests), the simplified-claiming integration suite (9 tests), Nuxt typecheck, and `git diff --check`.

Full validation passed: `bun run lint`; `bun run typecheck`; `bun run test:unit` (110 files, 773 tests); `bun run test:integration` (25 files, 360 tests); `bun run test:bdd` (51 standard scenarios and 2 destructive scenarios); and `git diff --check`.

Risk review: no schema, permissions, queue configuration, or deployment-variable change is required. Ordinary review messages retain their existing queue shape, so already queued application emails remain processable. Receipt delivery has the same queued retry and non-retryable failure behavior as application notifications. The local Cloudflare token could not list Email Sending domains, but the existing configured binding is already delivering production application email and this change does not alter it.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Replaced simplified claiming's application-approval notification with a one-time coupon receipt sent to the account email for every newly assigned coupon, including already-approved attendees. The receipt confirms the claim and includes the exact coupon link in HTML and text while repeat/concurrent claims remain single-send. Ordinary application emails are unchanged. Canonical docs and full unit, integration, and BDD validation pass.
<!-- SECTION:FINAL_SUMMARY:END -->
