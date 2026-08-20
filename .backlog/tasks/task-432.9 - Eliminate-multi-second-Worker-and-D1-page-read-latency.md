---
id: TASK-432.9
title: Eliminate multi-second Worker and D1 page-read latency
status: In Progress
assignee:
  - '@luna-performance'
created_date: '2026-08-20 22:46'
updated_date: '2026-08-20 23:20'
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
- [ ] #3 Server-Timing or equivalent phase instrumentation attributes actor, authorization, D1, serialization, and total request time on protected API responses without exposing sensitive data
- [ ] #4 The request-scoped database facade and page-shaped loaders do not add reflective/proxy/result-wrapping work proportional to query-builder internals or returned object graphs
- [ ] #5 A deployed browser gate fails on protected CF cache HIT/Age, 5xx responses, excessive Worker/API timing, or an incomplete user-visible page
- [ ] #6 Canonical docs and root agent instructions preserve the uncached runtime budgets and profiling method
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Canonical docs were updated or confirmed unchanged
- [ ] #2 Code behavior matches canonical docs
- [ ] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [ ] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [ ] #7 Auth and permissions changes follow the documented platform model
- [ ] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Capture warm baseline timings for facade construction, representative builder/result use, and the Participants page path.
2. Replace eager relational-query facade construction and recursive builder membrane work with lazy table lookup and constant-time shallow allowlisting while preserving the request-scoped session boundary.
3. Add protected API phase timing evidence for actor, authorization, D1, serialization, and total request time without sensitive values.
4. Add focused boundary, loader, timing, and benchmark-style regressions; validate the Participants response remains usable and same-session.
5. Run required validation, inspect scope, commit only TASK-432.9 files, and document deployed-evidence gaps.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Deployed SHA 77fa4ddf in Vienna: Settings page API MISS 6800ms; account overview MISS 16392ms; Operations MISS 8877ms; Participants attempts returned 503 BYPASS at 34782ms and 36593ms. A later Participants request returned 200; Wrangler tail reported wallTime 21005ms and cpuTime 3610ms with no logged exception. The page-shaped topology itself was correct: one cached session plus one selected page request, Operations did not call entry/applications, and Participants did not call applications/operations.

Cloudflare placement check: test D1 is ENAM with read replication disabled while browser/Worker traffic is VIE. Production D1 is EEUR with EU jurisdiction and read replication disabled. The test environment therefore adds transatlantic latency to every first-primary session and is not representative of production placement; test D1 must be migrated/reprovisioned in EU before final deployed latency comparison. The 3.61s Worker CPU remains a separate application-facade issue independent of database distance.

First complete local fix slice implemented (no push/deploy). AppDatabase now uses an explicit schema table allowlist with lazy per-table relational facades; it removes eager Object.entries(query), recursive safe constructor/prototype-chain construction, reflective dangerous-capability scans, and recursive unwrap/wrap work from ordinary builder methods. Only the explicit batch boundary recursively unwraps statement facades. Session-bearing builders remain sealed; the facade still blocks symbols, constructors, session/client/$client/binding/prepare/transaction entry points, and keeps a fixed inert safe constructor/prototype metadata object.

Protected API evidence now includes Server-Timing actor, authorization, d1, serialization, and total phases. The d1 phase description is strong:first-primary when a request starts without a bookmark and strong:bookmark when it is bookmark-anchored; bookmark values are never emitted. Account overview, event page context, Participants/page loaders, and judge assignment loaders include the phase measurements. Focused boundary, session, page-contract, timing, and representative Participants benchmark tests were added.

Local fake-D1 benchmark on the same workload: pre-slice facade at 7c9b63f construction median 0.107 ms, builder 0.016 ms, relational lookup 0.001 ms, Participants page 2.286 ms; final slice construction 0.081 ms, builder 0.014 ms, relational lookup 0.001 ms, Participants page 2.188 ms. This local harness does not reproduce the deployed 3.61 s Worker CPU, so these are directional CPU-shape evidence rather than production proof.

Cloudflare topology evidence: codex-events-test is ENAM with read replication disabled while browser/Worker traffic is VIE. The implementation preserves canonical HTTP strong consistency and does not add a replica or generic consistency option. The narrowest Cloudflare-first topology action is EU placement/reprovisioning for the test database before the final latency comparison; if the production strong primary is not EU-near VIE, an EU-primary migration is required. A split strong-auth/replica-read architecture would be a canonical architecture/docs change and is not implemented silently.

Validation passed: bun run lint; bun run typecheck; bun run test:unit (159 files, 1061 tests); bun run test:integration (43 files, 465 tests); bun run test:bdd:account-workspace (22 passed); git diff --check. Deployed browser/Worker acceptance gates remain pending because this slice was intentionally not deployed.
<!-- SECTION:NOTES:END -->
