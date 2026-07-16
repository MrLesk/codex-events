---
id: TASK-420.8
title: Send correction emails for malformed coupon claims
status: Done
assignee:
  - '@codex'
created_date: '2026-07-16 20:25'
updated_date: '2026-07-16 20:42'
labels: []
dependencies: []
modified_files:
  - server/domains/applications/review-emails.ts
  - server/domains/applications/review-email-queue.ts
  - tests/unit/server/domains/applications/review-emails.test.ts
  - tests/unit/server/domains/applications/review-email-queue.test.ts
parent_task_id: TASK-420
priority: high
type: bug
ordinal: 107000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Participants who claimed Vienna simplified rewards before the production URL repair received malformed coupon links. Add a dedicated transactional correction notification to the existing participant email queue, release it, and enqueue corrected per-participant links only for the 26 claims captured before the repair.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The correction email apologizes for the incorrect link, names the event, includes the exact corrected coupon, links to Codex Cloud usage, and explains the Sol paid-plan limitation while recommending Terra and Luna
- [x] #2 The existing participant notification queue validates and delivers correction messages with its current retry behavior while receipt and application-review emails remain unchanged
- [x] #3 The production recipient batch is reconciled against exactly the 26 pre-repair claimed reward IDs and excludes claims completed after the repair
- [x] #4 The production release succeeds and exactly 26 correction messages are accepted by the platform notification queue without exposing coupon values in logs or repository files
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
1. Extend the existing participant notification email input, renderer, and queue schema with a dedicated simplified-claim correction message. 2. Add focused unit coverage for correction copy, exact coupon and usage links, metadata, and queue validation; run required validation and release production. 3. Reconcile the 26 pre-repair claimed reward IDs to active account emails, submit one batch to the production participant queue, monitor processing for failures, and finalize the task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Actor: an event participant who already redeemed a coupon. Goal: receive an apology and the corrected, participant-specific coupon link without implementation details.

Canonical docs remain unchanged because this is a recovery notification using the existing participant email queue; it does not alter product lifecycle or permissions. No config, developer workflow, auth, or permission changes are required. Automated coverage validates the queue contract, copy, metadata, exact links, and preservation of existing notification behavior. Live provider delivery is intentionally not exercised by automated tests; production acceptance and queue processing are verified during the release operation.

Validation passed: bun run lint; bun run typecheck; bun run test:unit (110 files, 775 tests); bun run test:integration (25 files, 360 tests); bun run test:bdd (51 standard plus 2 destructive scenarios); git diff --check.

The secure pre-repair snapshot reconciles to exactly 26 unique claimed reward IDs, 26 unique active participant emails, and 26 canonical corrected coupon URLs for OpenAI Build Week Community Meetup - Vienna. The claim completed after the repair is absent from this fixed ID set.

Production release v1.19.3 completed successfully in GitHub Actions run 29532771866. At 2026-07-16T20:40:18.515Z, one private batch containing exactly 26 correction messages was accepted by the production participant notification queue. The immediate queue metric was 26 messages; subsequent realtime metrics reached zero. Observed queue consumer invocations used production Worker version 31293e9c-c6f7-43b5-b0e4-d18684d6cc12 and completed with outcome ok, no exceptions, and no error logs. No participant emails or coupon values were written to repository files or console logs.

Residual risk: platform and provider acceptance do not guarantee recipient inbox placement. No product follow-up is required unless delivery/bounce reports or participant support requests indicate an issue.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Released v1.19.3 with a dedicated simplified-claim correction email that apologizes, provides each participant's corrected coupon, links to Codex Cloud usage, and includes the requested Sol/Terra/Luna guidance. Reconciled the secure pre-repair snapshot to 26 unique active participants and excluded the later claim. Cloudflare accepted exactly 26 messages through the production platform queue; the backlog drained from 26 to zero and observed consumer invocations completed successfully without exceptions or error logs. Validation passed across lint, typecheck, 775 unit tests, 360 integration tests, and 53 BDD scenarios.
<!-- SECTION:FINAL_SUMMARY:END -->
