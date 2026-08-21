---
id: TASK-432.9.1
title: Eliminate the repeated protected D1 request stall
status: In Progress
assignee:
  - '@luna-actor-request-plan'
created_date: '2026-08-21 04:29'
updated_date: '2026-08-21 06:21'
labels: []
dependencies: []
parent_task_id: TASK-432.9
priority: high
type: enhancement
ordinal: 151000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Deployed signed-in browser evidence at d4644d5c shows /api/session resolving the same actor in 23–28 ms, but every immediately following protected page request spends roughly 3.1–3.9 seconds in one strong D1 read or an otherwise unaccounted database operation. Account overview, event entry, operations, Staff rosters, and Feedback all remain 3.6–4.1 seconds TTFB even though their page-shaped domain reads are only 37–289 ms. The Staff candidates request moves the stall from actor resolution to the subsequent candidates query, proving this is a request/database execution boundary rather than one query shape. Instrument and refactor the strong protected read architecture so representative critical APIs are sub-500 ms without stale actor tokens, weakened authorization, replica reads, or client-trusted capability state.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Per-statement and request-phase evidence identifies exactly where the 3-second stall occurs for actor and non-actor D1 reads; no multi-second time remains unattributed
- [ ] #2 Protected query APIs preserve server-side Auth0 identity binding, current platform consent, canonical authorization, one request-scoped D1 session, and strong bookmark semantics
- [ ] #3 The architecture removes serialized actor/page database round trips or other repeated request setup structurally across protected page-shaped routes rather than special-casing measured endpoints
- [ ] #4 Warm real-browser critical API TTFB is below 500 ms on account overview, event overview, operations, Staff, Feedback, staff dashboard, admin dashboard, and platform settings, with page usability below 1 second where the browser gate applies
- [ ] #5 Mutations still resolve canonical authorization and current consent at execution time, and query paths do not trust unsigned or stale client actor/capability data
- [ ] #6 Unit, integration, production-build, and real-browser topology/timing regressions fail if the repeated protected D1 stall or an extra actor round trip returns
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
1. Add request-scoped per-statement timing around the actual D1 session binding so every prepare/batch execution is attributed without changing behavior.
2. Reproduce the actor-fast/session versus page-slow pattern locally where possible and on test, including a non-actor candidates read.
3. Use the evidence to design one canonical strong protected request plan that resolves identity/consent/authorization and page data without serialized database round trips or stale client assertions.
4. Update canonical architecture and persistent agent guidance before applying the route migration.
5. Migrate representative page-shaped routes through the shared boundary, add source/reachability and browser timing gates, validate, deploy to test, and repeat the signed-in journeys.

Phase 1 evidence boundary: the capability-narrowed request-scoped D1 adapter wraps the one session's prepare/batch execution methods; deployment must inspect execution-level Server-Timing before any authorization or query redesign.

6. Apply the review corrections at the request-scoped session/timing adapter and fake-D1 boundaries, with focused security, concurrency, batch attribution, metadata, and timer-semantics coverage.

7. Apply the final request-boundary corrections: accept only opaque bookmarks except exact D1 constraints, mark standalone fake-D1 targets primary, and aggregate succeeded/failed/inflight executions across the bounded timing entries; record the unavoidable local metadata-validation gap.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Baseline at d4644d5c: /api/session TTFB 88–142 ms with actor-d1 23–28 ms. Account overview TTFB 3.69–3.97 s with actor-d1 3.41–3.79 s and page D1 58–100 ms. Event entry TTFB 4.12 s with actor-d1 2.91 s and page D1 289 ms. Operations TTFB 3.96 s with actor-d1 2.97 s and page D1 260 ms. Staff rosters TTFB 4.11 s with actor-d1 3.60 s and page D1 151 ms. Feedback 409 TTFB 3.65 s with actor-d1 3.14 s and page D1 37 ms. Staff candidates TTFB 3.65 s while actor-d1 was only 19 ms and total was 3.49 s, so the slow slot can move to the next D1-backed operation. Direct authenticated overview fetches with and without an incoming bookmark were both about 4.4 s, so the bookmark header alone is not the cause.

Phase 1 implementation is complete locally and remains pre-deploy. The capability-narrowed request-scoped D1 session adapter now attributes every executed prepared-statement method and batch with a request-local ordinal, API/kind, adapter duration, statement count, and bounded D1 metadata. Server-Timing fields are d1-exec-total, d1-db-total, and d1-exec-1 through d1-exec-8; d1-exec-total carries execution/statement/overflow counts, while d1-db-total and each entry carry known sql_duration_ms, explicit unknown counts, total_attempts, and bounded served_by_region/served_by_colo/served_by_primary summaries. Mixed serving metadata is reported as mixed; missing or error metadata stays unknown. SQL, binds, results, identity/cookie values, inferred table names, and raw capabilities are excluded. Fake-D1 exposes deterministic equivalent result metadata. A source invariant keeps execution timing at the capability-narrowed adapter and prevents route-level instrumentation. Validation: lint, typecheck, 165 unit files/1102 tests, 44 integration files/473 tests, focused request-timing integration 6/6 after final review, account-workspace BDD 25/25, build:cloudflare, and Wrangler deploy --dry-run all passed. ACs and DoD remain unchecked; status remains In Progress pending deployment evidence.

Review-correction implementation starts on b93af163. Scope is local-only: reject all reserved/constraint-like incoming D1 session values before withSession; report active D1 executions at timing emission; attribute ordered batch result metadata compactly without SQL or result leakage; mark aggregate metadata unknown/mixed when any included value is missing; make fake-D1 metadata follow its selected primary/replica target; and document Workers timer limitations. No push, deploy, or remote/test data mutation is authorized for this slice.

Review-correction validation on b93af163: bun run lint passed; bun run typecheck passed; bun run test:unit passed (165 files, 1102 tests); bun run test:integration passed (44 files, 482 tests); focused request-timing/fake-D1 integration passed (3 files, 38 tests); bun run test:bdd:account-workspace passed (25 tests); bun run test:bdd passed (88 chromium tests plus 2 destructive tests); bun run build:cloudflare passed; local node_modules/.bin/wrangler deploy --dry-run --config .wrangler/generated/test.jsonc passed with --dry-run: exiting now; git diff --check passed. The repository Wrangler wrapper was not runnable because CF_ACCOUNT_ID is absent, so no credentials or remote access were introduced. No push, deploy, or remote/test data mutation occurred; ACs/DoD/status remain unchanged pending the larger task's deployment evidence.

Final correction pass on 0575fe8 was implemented locally without push, deploy, or remote/test data mutation. The HTTP bookmark boundary now rejects only the exact case-sensitive D1 constraints first-primary and first-unconstrained; opaque values such as first-custom-bookmark, first_opaque, primary, unconstrained, and FIRST-PRIMARY reach withSession. Standalone fake-D1 prepare and batch targets report served_by_primary=true. d1-exec-total now reports executions, completed, succeeded, failed, inflight, statement counts, and bounded overflow; failed executions beyond the eight detailed entries remain aggregated.

Validation passed: focused request-timing/fake-D1 integration 38/38; bun run lint; bun run typecheck; bun run test:unit (165 files, 1102 tests); bun run test:integration (44 files, 487 tests); bun run test:bdd:account-workspace (25 tests); bun run build:cloudflare; direct node_modules/.bin/wrangler deploy --dry-run --config .wrangler/generated/test.jsonc; git diff --check.

Local fake/stub tests cannot validate the real Cloudflare withSession/batch response metadata shape. Required test-environment validation is the deployed signed-in browser journey with D1 Server-Timing and Workers Trace/Tail evidence; no brittle live integration test or local secrets are required.

Final validation: full local BDD passed (88 authenticated scenarios plus 2 destructive account-management scenarios). The run reset only local fixture state; no remote or deployed test data was changed. Fake/stub validation still cannot prove the real Cloudflare withSession/batch metadata shape; deployed signed-in browser, D1 Server-Timing, and Workers Trace/Tail evidence remain required.

Deployed test evidence at 0ae6a0e9 identifies the common stall boundary. Correlated signed-in browser and Wrangler Tail samples for structured routes reported 2.72–3.01 s Worker CPU and 3.27–3.59 s Worker wall time: account overview 2.831/3.359 s, staff workspace 2.721/3.455 s, events 3.014/3.586 s, current legal settings 2.729/3.274 s, and current platform documents 2.868/3.371 s. The plain /api/session route used 19 ms CPU and 69 ms wall time. Representative browser TTFB remained 3.7–4.0 s, while the first D1 execution span often absorbed 1.6–2.9 s because Workers timers advance at I/O boundaries and therefore do not prove D1 itself consumed that interval.

Every slow route crosses defineStructuredOperationApiHandler and imports the generated structured output-schema catalog; /api/session bypasses it. generated-output-schemas.ts is approximately 786 KB and eagerly executes roughly 170 z.fromJSONSchema calls at module initialization. Route data volume, authorization shape, and query count vary, including a single simple public D1 read, so they do not explain the shared CPU profile. The next bounded architecture slice is lazy, cached, per-operation schema construction with one canonical output-validation owner.

A separate deployed functional regression is now visible on direct event Staff and Operations page APIs: output validation returns 400 because event shell track objects contain keys excluded by the generated schema, and the validation error incorrectly labels output as request params. The schema slice must restore the canonical serialized track contract and identify output failures as output failures; it must not add permissive passthrough or compatibility fallbacks. Production was not touched.
<!-- SECTION:NOTES:END -->
