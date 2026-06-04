---
id: TASK-367
title: Withdraw Codex applications when Luma guests cancel
status: Done
assignee:
  - Codex
created_date: '2026-06-04 16:03'
labels:
  - luma
  - applications
  - integration
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/api-surface.md
  - docs/schema-outline.md
  - docs/testing-strategy.md
priority: high
ordinal: 64000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Handle Luma guest cancellation/status updates on the event-scoped Luma webhook by invoking the same Codex application withdrawal behavior used by admin-managed participant withdrawal instead of creating a separate webhook-only mutation path.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A signed event-scoped Luma `guest.updated` webhook with the configured event API ID and a declined/canceled guest status withdraws the matching submitted or approved Codex application.
- [x] #2 Luma-triggered withdrawal uses the same shared application withdrawal behavior as the existing admin withdrawal route, including team/member side effects and audit logs.
- [x] #3 Non-cancel Luma guest updates continue to be acknowledged without withdrawing applications unless they are check-in updates already handled by attendance sync.
- [x] #4 Rejected, withdrawn, unmatched, duplicate, or wrong-event Luma guest updates are acknowledged without unsafe mutations.
- [x] #5 Relevant docs and tests cover Luma cancellation webhook behavior and the shared withdrawal path.
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
- [x] Extract the existing admin-managed withdrawal mutation into shared application-domain behavior.
- [x] Add Luma guest cancellation extraction for signed `guest.updated` payloads.
- [x] Route Luma cancellation webhooks through the shared withdrawal behavior.
- [x] Keep non-cancel updates on the existing attendance or acknowledgment paths.
- [x] Update canonical docs and focused tests.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Luma cancellation is handled only after webhook signature verification and event API ID matching.
- Matching still uses the event participant's canonical `lumaEmail`.
- The Luma webhook does not maintain separate team or submission behavior; blocked team/submission cases are handled by the shared admin-managed withdrawal plan and acknowledged without mutation.
- `bun run test:bdd` was run three times. One run failed during Auth0 bootstrap. Later runs completed bootstrap; the stock combined command failed only in the public project with `page.goto` `net::ERR_ABORTED` timeouts while the authenticated project passed. The public project passed when run alone, and the destructive authenticated project passed when run separately.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added Luma guest cancellation handling to the event-scoped webhook route. A declined/canceled/not-going Luma `guest.updated` payload now resolves the participant by Luma email and invokes the same shared admin-managed withdrawal behavior used by the admin withdrawal route, including team membership, team dissolution, pending join-request cleanup, Luma rejection enqueueing, and audit logs.

The existing attendance check-in behavior remains intact for non-cancellation guest updates. Canonical docs and tests now describe and cover cancellation sync, wrong-event/no-match/no-mutation cases, and the shared withdrawal side effects.

Validation passed for lint, typecheck, unit tests, integration tests, focused Luma webhook tests, admin application route integration tests, isolated public BDD, and isolated destructive authenticated BDD. The stock combined `bun run test:bdd` command still hit a public-project `page.goto` timeout when the public and authenticated BDD projects ran together; the same public scenarios passed when isolated.
<!-- SECTION:FINAL_SUMMARY:END -->
