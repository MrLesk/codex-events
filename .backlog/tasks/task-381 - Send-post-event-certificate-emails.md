---
id: TASK-381
title: Send post-event certificate emails
status: Done
assignee:
  - '@codex'
created_date: '2026-06-10 07:30'
updated_date: '2026-06-21 12:42'
labels:
  - api
  - email
  - events
milestone: m-2
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Event admins and platform admins can send certificate thank-you emails from the Certificates tab. The action sends only to approved participants who currently have certificate access and have not already received this certificate email. Admins can run the action again after manually marking additional participants as joined; only newly eligible unsent participants receive email.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Certificates tab exposes an admin-only manual action to send certificate thank-you emails.
- [x] #2 The action sends only to approved participants who currently have certificate access, have an active email, are not current event staff, and have not already had a certificate email queued or sent.
- [x] #3 Running the action again after more participants are manually marked joined sends only to newly eligible unsent participants.
- [x] #4 Certificate email delivery reuses the existing event outcome email queue, Cloudflare Email Service helpers, and retry behavior.
<!-- AC:END -->



## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add application-level certificate email queued/sent fields and migration.
2. Extend event outcome email content and queue processing for certificate emails.
3. Add an event-admin action that reserves eligible applications before enqueueing certificate email messages.
4. Add the Certificates tab button and ready/sent counts.
5. Update canonical docs and tests, then run required validation.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented the reusable certificate email send feature. Applications now store certificate_email_queued_at, certificate_email_queued_by_user_id, and certificate_email_sent_at. The admin action reserves eligible applications before queue enqueueing, clears reservations when enqueue fails, and queue processing re-checks certificate availability before sending. Validation passed: bun run lint, bun run typecheck, bun run test:unit, bun run test:integration, bun run test:bdd.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented admin-triggered certificate thank-you emails from the Certificates tab with reservation-based idempotency. Repeated sends skip already queued/sent participants and pick up newly joined eligible participants. Updated docs and tests; validation passed with lint, typecheck, unit, integration, and BDD suites.
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
