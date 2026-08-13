---
id: TASK-426
title: Add optional private talk proposals for Meetup events
status: Done
assignee:
  - '@codex-talks'
created_date: '2026-08-13 20:08'
updated_date: '2026-08-13 22:16'
labels:
  - backend
  - frontend
  - cloudflare
  - meetup
dependencies: []
priority: high
type: feature
ordinal: 113000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: a Meetup organizer can optionally open a private call for talks while the Meetup remains a registration-focused event. Registered applicants can draft and submit one proposal, event staff can review it read-only, and event or platform admins can make private accept/reject decisions.

This feature is only for events whose type is Meetup. It is not a hackathon project submission, does not publish speaker proposals or accepted talks, and does not create or synchronize agenda entries. Existing Meetups remain disabled by default with no backfill.

Participant language should use Talk proposal and Call for talks. The proposal contains a title, abstract, and optional HTTP(S) demo-or-slides URL. All participant, reviewer, and public surfaces must reuse the project interface system and keep route pages as orchestration surfaces.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Canonical domain, lifecycle, permissions, schema, API, testing, tech-stack, README, operator, and developer documentation describes the feature as current product truth before implementation diverges from it.
- [x] #2 Meetup event create/update/read contracts include talkProposalsEnabled, talkProposalOpensAt, and talkProposalClosesAt; enabled Meetups require a valid independent window and non-Meetups cannot enable or retain the fields.
- [x] #3 Existing Meetups default to disabled with null proposal dates; after any proposal exists admins cannot disable the feature, but may adjust the closing time before event completion.
- [x] #4 The talk_proposals model stores at most one proposal per event/user with status, title, abstract, optional HTTP(S) demo-or-slides URL, decision message, lifecycle/reviewer timestamps, and email-delivery timestamps; review queries are indexed.
- [x] #5 Participant lifecycle supports draft to submitted to withdrawn to draft and submitted to accepted or rejected; submitted proposals are read-only, withdrawal/revision/resubmission is only before the deadline, and admin decisions are final.
- [x] #6 A participant can create or submit while their application is submitted or approved; a later rejected or withdrawn application does not hide or invalidate the proposal, but pauses speaker mutations until eligibility is restored before the deadline.
- [x] #7 Event and platform admins can accept or reject submitted proposals after the proposal window closes but before event completion; staff can list and inspect proposals but cannot decide; unresolved proposals do not block event completion.
- [x] #8 Participant APIs support own read/create/update, submit, withdraw, and revise; staff/admin APIs support paginated list/detail; admin APIs support accept/reject with an optional speaker-facing message.
- [x] #9 Acceptance and rejection enqueue retryable decision emails containing the decision, optional message, and workspace link; queue failures do not roll back decisions and delivery attempts/outcomes are recorded and audited idempotently.
- [x] #10 The public Meetup page shows a Call for talks action only while the window is upcoming or open and routes applicants through the existing registration/account handoff; no proposal content is public.
- [x] #11 The account event workspace provides a Talk proposal tab for eligible applicants and retained proposal owners plus staff/admin review access, using existing App components, vee-validate/Zod, participant-submission, and application-review patterns without nested card surfaces.
- [x] #12 Account deletion removes the user private talk proposal data.
- [x] #13 Unit, integration, and BDD tests cover validation, eligibility, lifecycle, permissions, deadlines, application-status changes, staff/admin review, emails, public callout, and disabled/closed/completed states.
- [x] #14 The additive D1 migration, email queue resources, Worker/deployment configuration, and required validation suite are complete: lint, typecheck, unit, integration, BDD, Cloudflare build, and git diff check.
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
Execute TASK-426.1 through TASK-426.4 sequentially. Update canonical docs first, then data/domain behavior, APIs/email, UI, and final validation/operating guidance. Coordinate shared docs and Cloudflare config edits with the MCP owner; do not commit or push until integration is authorized.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Final parent verification (2026-08-14): TASK-426.1 through TASK-426.4 are Done and their objective evidence supports all parent acceptance criteria. Rendered Talk browser BDD passed 4/4, including admin acceptance and Do not accept through real controls, the optional speaker message, final rejected status, staff read-only access, retained-owner visibility, participant transitions, public states, and durable decision-email enqueue evidence. Focused affected unit/config tests passed 28/28 and Talk API plus migration integration tests passed 34/34. Final combined validation passed lint, typecheck, unit (121 files/824 tests), integration (28 files/379 tests), BDD (59 tests), Cloudflare build, and git diff --check. Delivery boundary: Cloudflare Queues is at least once; durable producer/consumer leases and completed-duplicate suppression prevent concurrent or already-recorded repeat sends, and deterministic delivery identity supports provider-side duplicate suppression, but a worker crash after provider acceptance and before the sent-state write can still cause a later retry when the provider does not honor that identity.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added optional private Meetup calls for talks across canonical docs, configuration and persistence, participant/reviewer/admin APIs, durable decision-email delivery, public/account/admin interfaces, Cloudflare rollout configuration, and operating guidance. Verified with rendered accept/reject BDD, focused race/retry/UI/API/migration coverage, and the full lint, typecheck, 824-unit, 379-integration, 59-BDD, Cloudflare-build, and diff-check suite.
<!-- SECTION:FINAL_SUMMARY:END -->
