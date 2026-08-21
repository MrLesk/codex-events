---
id: TASK-432.7.2
title: Prevent implicit retries on protected tab reads
status: In Progress
assignee:
  - '@codex'
created_date: '2026-08-21 02:39'
updated_date: '2026-08-21 04:10'
labels: []
dependencies: []
parent_task_id: TASK-432.7
ordinal: 150000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Deployed signed-in browser verification at SHA ec90231d found protected query-only tabs issuing duplicate reads without user intent: Event Staff started a second roles/candidates GET immediately after the first completed 200, and Event Feedback started a second feedback GET immediately after the first completed the expected 409 for the event lifecycle. Make the shared protected data boundary distinguish cancellation, transport failure, and terminal business responses so tab activation performs one read and only explicit user intent can retry.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A query-only protected tab dispatches at most one active request for each data key when mounted or activated
- [x] #2 A successful 2xx response does not trigger an immediate duplicate read through remount, watcher, or refresh coupling
- [x] #3 A terminal 4xx business response, including lifecycle 409, is presented once and does not automatically retry
- [x] #4 Cancellation and stale-response suppression continue to work without converting an abort into a retry
- [x] #5 The invariant is owned by the shared protected fetch/data architecture rather than Staff, Feedback, or other page-local flags
- [x] #6 A deterministic browser regression covers the Staff candidates 200 case and Feedback 409 case without timing sleeps or relaxed request counts
- [x] #7 Watched protected-read inputs cannot reuse a settled response for a different request shape; the owner key changes or the prior settlement is invalidated before execution
- [x] #8 The shared protected request owner has an explicit bounded retention policy that preserves active subscribers and same-key settlement deduplication without unbounded app-lifetime growth
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
1. Keep the existing page-level cancellation and route guards, but trace the shared protected read boundary and all consumers of the affected keys.
2. Add a request-owner/settlement layer shared by protected async-data reads and imperative protected reads: one active owner per canonical data key, settled 2xx and terminal 4xx results retained until explicit refresh or a real key/authorization-generation change, transport failures retryable by explicit policy, and aborts stale without becoming retries.
3. Route the roster candidate read through the same protected ownership boundary so independently mounted roster panels cannot issue duplicate page-one reads; preserve search, pagination, and cancellation semantics.
4. Add focused unit coverage for in-flight ownership, 2xx/4xx settlement, transport failure, explicit refresh, key/generation changes, and abort/stale suppression.
5. Add deterministic account-workspace browser coverage for Staff candidates 200 and Feedback lifecycle 409 with exact request counts and event-based synchronization only.
6. Run targeted checks, lint, typecheck, unit, integration, account-workspace BDD, and full BDD; review scope and commit only TASK-432.7.2 files without pushing.

7. Fresh reviewer pass: audit every uncommitted file against the shared protected request boundary and closest composable/component patterns; remove unnecessary page-local or compatibility behavior.
8. Make the known Feedback lifecycle 409 expectation exact and isolated, with event-based synchronization and no sleeps or global error suppression.
9. Run targeted Staff/Feedback, account-workspace, lint, typecheck, unit, integration, regular/destructive BDD, and diff checks; update objective evidence and commit only task-scoped files without pushing.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Current-state evidence (2026-08-21):
- The shared protected boundary derives the Nuxt and owner identity from authorization generation, the base key, every declared reactive watch source, and request-shaping inputs. useApiData and useApiFetch compute the same identity before Nuxt watcher execution, so a changed watched shape cannot reuse a settled 2xx or 4xx response.
- Each Nuxt app owns a bounded inactive-settled LRU of 32 entries. Trimming evicts only settled entries with no active subscribers, never aborts an active read, and runs after settlement and subscriber cleanup. Same-key in-flight sharing, settled 2xx/4xx dedupe, explicit invalidation, authorization-generation separation, and abort/stale behavior remain intact.
- Focused proof covers reactive-key freshness, bounded retention, active-subscriber preservation, Staff candidates 200 settlement, and Feedback lifecycle 409 settlement.
- Earlier clean shared-checkout gates: lint, typecheck, unit 1,096, integration 470, account-workspace BDD 25, regular BDD 88, and destructive BDD 2.
- Final gates after this patch: targeted composable unit tests 16 passed; lint passed; typecheck passed; unit 165 files / 1,101 tests passed; integration 44 files / 470 tests passed; account-workspace BDD 25 passed; regular BDD 88 passed; destructive BDD 2 passed; Cloudflare production build passed; git diff --check passed.
- No production, remote-test, or deployment verification was performed. TASK-432.7.2 remains In Progress pending deployed browser verification.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @codex
created: 2026-08-21 03:12
---
Fresh reviewer/finisher takeover: auditing the existing uncommitted patch before making any code changes.
---

author: @codex
created: 2026-08-21 03:47
---
Fresh architecture review blocked rollout: protected useAsyncData watch changes can reuse stale owner-cached data when the watched request shape is absent from the key, and settled search/page entries have no memory bound. A fresh Luna worker must make both invariants structural, update persistent guidance, and add deterministic tests before push.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented the shared protected-read freshness and bounded-retention invariants. Watched request shapes now participate in the pre-watcher Nuxt and owner identity, and each Nuxt app retains only a bounded inactive-settled LRU without evicting active subscribers. Focused, unit, integration, account-workspace, regular 88-test, destructive 2-test, lint, typecheck, production build, and diff checks pass. Remains In Progress pending deployed browser verification.
<!-- SECTION:FINAL_SUMMARY:END -->
