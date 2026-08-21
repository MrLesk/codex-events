---
id: TASK-432.9
title: Eliminate multi-second Worker and D1 page-read latency
status: In Progress
assignee:
  - '@luna-performance'
created_date: '2026-08-20 22:46'
updated_date: '2026-08-21 07:25'
labels: []
dependencies: []
parent_task_id: TASK-432
priority: high
type: bug
ordinal: 144000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Deployed real-browser verification shows that the page-shaped topology removed request fan-out but the genuine Cloudflare Worker/D1 execution path is still one to two orders of magnitude too slow. Cold cache misses take 6.8-16.4 seconds, and the Participants page produced two empty-body 503 responses after roughly 35 seconds before a later 200 completed with 21.0 seconds wall time and 3.61 seconds Worker CPU. The architecture must make representative uncached page reads sub-second without relying on shared protected caching.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Uncached authenticated account overview, event Operations, Settings, and Participants reads complete within the documented deployed wall-clock and Worker CPU budgets
- [ ] #2 Participants returns a usable page without automatic multi-second 503 retries
- [x] #3 Server-Timing or equivalent phase instrumentation attributes actor, authorization, D1, serialization, and total request time on protected API responses without exposing sensitive data
- [ ] #4 The request-scoped database facade and page-shaped loaders do not add reflective/proxy/result-wrapping work proportional to query-builder internals or returned object graphs
- [ ] #5 A deployed browser gate fails on protected CF cache HIT/Age, 5xx responses, excessive Worker/API timing, or an incomplete user-visible page
- [x] #6 Canonical docs and root agent instructions preserve the uncached runtime budgets and profiling method
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [x] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reconcile TASK-432.9 with the ec90231 deployed browser evidence and trace Auth0 session, actor, request-scoped D1 session, authorization, page loader, and response hooks.
2. Add only phase evidence that separates Auth0 session resolution, actor D1, request-session/facade construction, and structured-route D1 work; preserve strong session/bookmark descriptors and treat unwrapped work as unattributed.
3. Collapse normal HTTP platform-user identity and current-consent resolution into one strongly consistent D1 statement while preserving latest-document semantics, canonical authorization, and the one-bootstrap/one-critical-read contract.
4. Add integration and unit guards for actor shape, current-document semantics, one-session/one-hot-path statement topology, timing labels, public structured-route attribution, and no per-page actor fan-out.
5. Update canonical performance/testing docs and root AGENTS.md; run targeted, required, BDD, Cloudflare build, and Worker-runtime validation; inspect and commit only TASK-432.9 changes without pushing.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Deployed evidence at ec90231db488785e15e99637c12e74c1ba39ef1e on test.codex-events.com: CodeQL and deploy-test green; Worker bound to codex-events-test-eu UUID 7ce9568f-1ba6-49dd-bb3c-7e378b5f8a78, jurisdiction eu, EEUR, read replication disabled. Protected topology is one /api/session followed by one page-shaped read, with private no-store responses and no CF HIT/Age. Cold browser reads: account wall 4.344s; overview TTFB 2.959s, actor 2.042s, D1 87ms, total 2.129s; Operations wall 5.372s, TTFB 3.726s, actor 3.116s, D1 206ms, total 3.322s; Participants wall 5.059s, TTFB 4.001s, actor 2.927s, D1 163ms, total 3.090s; Settings wall 5.229s, TTFB 3.546s, actor 2.536s, D1 199ms, total 2.735s; Staff wall 5.078s, TTFB 3.417s, actor 3.154s, D1 25ms, total 3.179s. Admin /api/events and platform legal settings also report 3.6-3.7s TTFB with phase counters at zero, so those routes remain unattributed. Warm per-navigation bootstrap is 130-245ms TTFB and 81-122ms total.

The request trace showed Auth0 getSession, an identity-to-user join, two current platform-document reads, and one acceptance read on the protected actor path; the hot-path integration fixture recorded five statements on one strong session. The shared browser client already forwards the returned X-D1-Bookmark to later API requests. Cloudflare Workers best-practice guidance and @cloudflare/workers-types@5.20260821.1 were fetched before review.

This slice measures actor-session and actor-d1 subphases, measures request database-session construction, attributes public structured-route D1 work, parallelizes the independent event list/count reads, and replaces the normal platform-user actor fan-out with one strong identity-and-current-consent statement. Current-document semantics are enforced inside the statement using latest-version and acceptance predicates; /api/session retains its separate event-role read.

The remaining deployment-only question is whether the multi-second cold gap is primarily Auth0/session or first-primary/Worker initialization rather than actor SQL. ec90231 predates these subphases, so the test Worker must be redeployed and profiled in a real browser before claiming the task deployed latency budgets or attributing public routes whose counters were zero.

Validation: targeted actor/document unit tests (15), authorization unit tests (13), request-timing and actor-hot-path integration tests (8) passed. Full local unit passed 164 files/1,091 tests; integration passed 44 files/470 tests; account-workspace BDD passed 23/23; full BDD passed 86 tests plus the 2-test destructive phase; Cloudflare build and Wrangler deploy --dry-run passed. bun run lint and bun run typecheck passed on the TASK-432.9 source state before unrelated concurrent TASK-432.7.2 edits appeared; a final mixed-worktree rerun reports only those unrelated composable errors, while targeted ESLint and git diff --check pass. No deploy or push was performed. Deployment-only real-browser profiling remains required.

TASK-432.9.1 and TASK-432.9.1.1 are complete on test Worker 1bbd1f6c-8762-467c-b87d-b957252d4ddc. Browser/Tail correlation identified and removed the shared 2.7-3.0 second eager generated output-schema CPU cost. Warm protected APIs now complete in 61-447 ms, and representative API-backed page content becomes visible in 307-718 ms in a signed-in real browser. TASK-432.9 remains open because network-quiet totals can still reach 1.1-2.2 seconds from late icon/media requests, and event entry still uses 13 D1 statements with 130 ms Worker CPU. These residuals—not the resolved structured-route stall—remain the current optimization scope.
<!-- SECTION:NOTES:END -->
