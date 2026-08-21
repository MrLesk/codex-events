---
id: TASK-432.7.2
title: Prevent implicit retries on protected tab reads
status: In Progress
assignee:
  - '@codex'
created_date: '2026-08-21 02:39'
updated_date: '2026-08-21 03:31'
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
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [ ] #3 Relevant validation commands pass
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
Pre-fix reproduction: the local account-workspace browser suite passed 23 scenarios, but the Staff case recorded two identical GETs to /api/events/<event>/roles/candidates?page=1&page_size=20 while the protected rosters page read remained single. A fresh signed-in deployed browser capture at ec90231d reproduced the terminal Feedback case with two identical GETs to /api/account/events/cfp-test-meetup-august-2026/feedback?includeEventShell=true, both 409; the second began immediately after the first response without user intent. The Staff trace showed two candidate requests start back-to-back before the first response. Root cause is multiple lifecycle owners and unconditional async-data/watch activation at the shared boundary, not a Staff/Feedback-specific user action.

Reviewer validation evidence (2026-08-21):\n- Targeted TASK-432.7.2 browser scenarios: 2 passed in 14.1s. Staff candidates emitted exactly one protected candidates GET and returned 200. Feedback emitted exactly one protected feedback GET and returned the expected lifecycle 409; exactly one matching browser console 409 was allowed, with no page errors, API errors, or duplicate request.\n- Full account-workspace BDD: 25 passed in 40.2s (the 23-case suite plus the two TASK-432.7.2 scenarios); topology checks recorded no duplicate protected reads.\n- lint: passed.\n- typecheck: passed.\n- unit: 165 files / 1,096 tests passed.\n- integration: 44 files / 470 tests passed in 104.92s.\n- git diff --check: passed.\n- Full regular BDD in the task-isolated checkout: 87/88 passed. The sole failure was the temporary checkout's symlinked node_modules causing Vite to request photoswipe.css through an out-of-root /_nuxt path (403/404); the protected operations read itself was one request and returned 200. The shared checkout's regular run was 86/88 because the unrelated uncommitted app/composables/useAccountBootstrap.ts patch caused two simplified-claiming SSR 500s; that file is excluded from this task.\n- Destructive BDD did not run after the regular suite failure. Task remains In Progress rather than Done until the required full regular/destructive gate is rerun in a clean validation environment.\n- No deployment or remote-test verification was performed; no push was made.\n\nArchitecture evidence: ofetch's implicit GET retry could replay a terminal 409, and separate lifecycle owners could replay settled reads. The shared protected request owner now keys ownership by authorization generation and request key, retains every non-abort settlement until explicit refresh/action invalidation, preserves abort/stale-response behavior, and the low-level protected client structurally forces retry:false.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @codex
created: 2026-08-21 03:12
---
Fresh reviewer/finisher takeover: auditing the existing uncommitted patch before making any code changes.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented TASK-432.7.2's shared protected-read ownership and retry policy. Protected reads now force retry:false; one owner per authorization generation/request key retains non-abort settlements until explicit user refresh/action, while aborts remain aborts. Staff 200 and Feedback 409 browser regressions pass with exact request counts. Targeted, account-workspace, lint, typecheck, unit, integration, and diff checks pass. Full regular BDD is not clean because of validation-environment/unrelated-worktree failures, destructive BDD was not run, so the task remains In Progress.
<!-- SECTION:FINAL_SUMMARY:END -->
