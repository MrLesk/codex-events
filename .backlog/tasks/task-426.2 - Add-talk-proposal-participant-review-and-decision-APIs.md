---
id: TASK-426.2
title: Add talk-proposal participant review and decision APIs
status: Done
assignee:
  - '@codex-talks'
created_date: '2026-08-13 20:10'
updated_date: '2026-08-13 21:21'
labels:
  - backend
  - cloudflare
  - email
  - meetup
dependencies:
  - TASK-426.1
modified_files:
  - server/domains/talk-proposals/index.ts
  - server/domains/talk-proposals/emails.ts
  - server/domains/talk-proposals/email-queue.ts
  - 'server/api/events/[eventId]/talk-proposals/me.get.ts'
  - 'server/api/events/[eventId]/talk-proposals/me.post.ts'
  - 'server/api/events/[eventId]/talk-proposals/me.patch.ts'
  - 'server/api/events/[eventId]/talk-proposals/me/actions/submit.post.ts'
  - 'server/api/events/[eventId]/talk-proposals/me/actions/withdraw.post.ts'
  - 'server/api/events/[eventId]/talk-proposals/me/actions/revise.post.ts'
  - 'server/api/events/[eventId]/talk-proposals/index.get.ts'
  - 'server/api/events/[eventId]/talk-proposals/[proposalId]/index.get.ts'
  - >-
    server/api/events/[eventId]/talk-proposals/[proposalId]/actions/accept.post.ts
  - >-
    server/api/events/[eventId]/talk-proposals/[proposalId]/actions/reject.post.ts
  - server/plugins/talk-proposal-decision-email-queue.ts
  - server/plugins/application-review-email-queue.ts
  - server/plugins/application-luma-sync-queue.ts
  - server/plugins/event-outcome-email-queue.ts
  - server/domains/accounts/index.ts
  - nuxt.config.ts
  - tests/support/backend/api-route.ts
  - tests/unit/server/domains/talk-proposals/email-queue.test.ts
  - tests/integration/server/api/talk-proposal-routes.test.ts
parent_task_id: TASK-426
priority: high
type: task
ordinal: 119000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Expose the private talk-proposal workflow through REST APIs and asynchronous decision email delivery, using the domain rules from TASK-426.1. Participants act only on their own proposal. Event staff can list and inspect proposals but cannot decide. Event admins and platform admins can accept or reject submitted proposals before event completion, including after the proposal window closes.

Participant APIs: own proposal read/create/update, submit, withdraw, and revise. Reviewer APIs: paginated event list and proposal detail. Admin actions: accept/reject with an optional speaker-facing message. Preserve proposals if the application later becomes rejected or withdrawn. Decisions remain committed if email enqueue/delivery fails. Account deletion removes private proposal data.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Participant endpoints implement own read/create/update, submit, withdraw, and revise using shared Zod contracts, standard envelopes, exact ownership, eligibility, status, and deadline guards.
- [x] #2 Paginated reviewer list/detail endpoints allow event staff, event admins, and platform admins to inspect retained proposals, including when an owner application is later rejected or withdrawn.
- [x] #3 Accept/reject endpoints allow event or platform admins only, require submitted status, allow decisions after the proposal close time, reject decisions after event completion, and store the optional speaker-facing message and reviewer.
- [x] #4 Staff attempts to decide and participant attempts to inspect another proposal fail with existing sanitized authorization errors.
- [x] #5 Decision actions enqueue acceptance/rejection emails with decision, optional message, and account-workspace link; enqueue failure does not roll back the persisted decision.
- [x] #6 Queue consumption is retryable and idempotent, records queued/sent/failure outcomes and timestamps, and produces the expected audit records without proposal bodies in infrastructure logs.
- [x] #7 Account deletion removes the user private talk proposal and dependent private delivery state.
- [x] #8 Integration tests cover APIs, pagination, role boundaries, deadline/completion guards, changed applicant status, decisions, audits, queue retry/idempotency, and email formatting.
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
1. Replace content-bearing queue payloads with proposal ID plus deterministic delivery ID and load private content only after a durable consumer claim.
2. Add producer enqueue leases, automatic scheduled/startup reconciliation, attempt/outcome audits, and consumer delivery leases with retry/duplicate/crash-safe state transitions.
3. Expand API and queue tests for rejection, concurrent decisions/enqueue, producer failure recovery, duplicate/concurrent consumption, stale leases, terminal outcomes, and deletion.
4. Run focused queue/API/type/lint validation, then finalize 426.2 before activating UI work.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Research: participant routes follow applications/me and submission action handlers; reviewer access follows requireEventApplicationVisibilityContext/resolveEventAuthorization; final decisions follow application review persistence-before-queue semantics; queue delivery follows application review and outcome queue producer/consumer patterns.

Implemented the stable 10-operation REST inventory, participant ownership and lifecycle routes, staff/admin retained review, final admin decision actions, retryable/idempotent decision-email queue and formatter, audit records without proposal bodies, and explicit account-deletion cleanup. Shared operation inventory was delivered to TASK-425 and registered there.
Validation: talk-proposal unit suite 7 tests passed; talk-proposal API integration suite 5 tests passed; targeted ESLint passed; git diff --check passed. Typecheck passed before concurrent MCP route edits, then reported only two current implicit-any errors in server/routes/mcp.post.ts.

Cross-review remediation (2026-08-13): reopened pending dependency 426.1. Accept/reject lacked a status='submitted' compare-and-swap, producer enqueue failure had no durable recovery path, and queue delivery lacked a durable claim/lease. Successful rejection, concurrent decisions, enqueue recovery, duplicate delivery, and crash/retry states need objective coverage.

Remediation research: Nitro cloudflare_module supports the cloudflare:scheduled hook; Cloudflare Queues is at-least-once and individual messages support explicit ack/retry. The implementation will retain a durable proposal-row outbox, use deterministic IDs and expiring claims, and document the unavoidable crash window after provider acceptance but before the sent-state write.

Remediation implemented without changing the stable 10-operation paths/contracts. Decision actions now call the submitted-status CAS and enqueue the durable pending row through a producer lease. Queue messages contain only proposal ID plus deterministic delivery ID; private recipient/event/message data is loaded after a durable consumer claim. Failed/missing producer attempts remain pending and are recovered by startup plus cloudflare:scheduled reconciliation. Consumer delivery uses an expiring CAS lease, deterministic provider metadata, explicit retry/ack, completed duplicate suppression, active-claim deferral, and stale-claim recovery. Attempt/outcome audits contain identifiers/status/reasons but no proposal body fields. Validation: 14 focused queue/API tests passed, including successful rejection, producer failure recovery, concurrent decisions, concurrent/duplicate delivery, active/stale leases, provider retry, deterministic email key, and deletion; Nuxt typecheck, targeted ESLint, and git diff --check passed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Made Talk proposal decisions and decision-email delivery concurrency-safe and recoverable. Final decisions use a submitted-status CAS; durable pending rows survive producer failure; startup/scheduled reconciliation republishes deterministic minimal messages; queue consumers use expiring claims and explicit at-least-once handling. Verified with 14 focused queue/API tests, typecheck, targeted lint, and diff checks.
<!-- SECTION:FINAL_SUMMARY:END -->
