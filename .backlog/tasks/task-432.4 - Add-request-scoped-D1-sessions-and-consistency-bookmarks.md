---
id: TASK-432.4
title: Add request-scoped D1 sessions and consistency bookmarks
status: In Progress
assignee:
  - '@luna-d1'
created_date: '2026-08-19 06:22'
updated_date: '2026-08-19 20:39'
labels: []
dependencies:
  - TASK-432.1
references:
  - server/database/client.ts
  - wrangler.jsonc
  - tools/deploy/generate-wrangler-config.ts
parent_task_id: TASK-432
priority: high
type: enhancement
ordinal: 131000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Introduce a shared request-scoped Cloudflare D1 Sessions access path with strong consistency and explicit read-after-write semantics, preserving equivalent local fake-D1 behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Each HTTP request obtains one shared database client backed by one logical D1 session
- [x] #2 Responses expose the next bookmark through one documented transport without leaking it into domain contracts
- [x] #3 Local fake-D1 and integration support exercise the same application-facing database abstraction
- [x] #4 Deployment guidance documents enabling read replication separately from checked-in binding configuration
- [x] #5 Tests cover session reuse, bookmark propagation, read-only requests, and write-followed-by-read behavior
- [x] #6 HTTP handlers cannot access the raw D1 binding and all prepared statements or batches participate in the request session and bookmark
- [x] #7 One global response hook owns bookmark emission for API, raw-route, success, and error responses
- [x] #8 The local fake-D1 can model a stale replica and proves that an unbookmarked read may be stale while a bookmarked read observes the write
- [x] #9 Direct database injection is restricted to explicit test or non-HTTP execution paths and cannot silently bypass request sessions
- [x] #10 Strong consistency is the only production HTTP database path; no generic consistency option or public-replica accessor is exposed; actor, consent, permission, lifecycle, mutation, and read-after-write paths use request-scoped primary or bookmarked sessions.
- [x] #11 The returned application database does not expose a public Drizzle $client or raw binding/session capabilities; raw prepare and batch access is available only through the request-scoped session accessor.
- [x] #12 The returned Drizzle application database and every runtime object reachable from it do not expose session/client/prepare/batch capabilities; only getDatabaseSession(event) exposes raw request-session operations.
- [x] #13 HTTP-triggered queue, startup, and recovery paths cannot construct a standalone non-HTTP database; they receive the request-scoped AppDatabase or use an explicit non-HTTP execution entrypoint.
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
1. Build a private Drizzle target with an application facade and runtime membrane that hides nested session/client/prepare capabilities while preserving public query builders, execute, and batch behavior.
2. Add runtime, type, and same-session integration regressions for nested capability paths, operations, and failed mutation attempts.
3. Remove non-HTTP database construction from queue domains; pass request databases from startup middleware and construct databases only in queue/scheduled plugins.
4. Strengthen the production source-boundary test and update concise D1 guardrails if needed.
5. Run scoped and required validation, inspect the isolated diff, and create one local TASK-432.4 commit without pushing.

6. Replace the current Drizzle membrane with an explicit closed AppDatabase facade whose public and reachable runtime graph contains only supported application query operations; keep raw prepare/batch exclusively on getDatabaseSession(event) and prove same-session Drizzle/raw/batch behavior.

7. Split HTTP-triggered startup/recovery entrypoints from non-HTTP database adapters; pass the request-scoped database/session into waitUntil work and remove mixed-module source-test exemptions.

8. Add structural reachability/source tests, writable-CTE and mixed batch rollback/bookmark coverage, and actual Nitro success/error/handled-response hook coverage where the local harness permits.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented request-scoped AppDatabaseAccess over one D1 session with typed consistency selection, bookmark transport, conflict enforcement, API/Nitro response emission, fake-D1 session/bookmark behavior, and per-request integration harness coverage.
Focused session integration tests, related database tests, and typecheck pass. Full integration reaches 385 passing tests; 4 unrelated failures remain in the concurrently modified event-image worker files.

Final verification: focused request-scoped integration, related database/API integration, scoped server TypeScript, scoped ESLint, unit (126 files/932 tests), and deployment config generator (8 tests) passed locally against fake D1 only. Full bun run lint has three errors only in concurrently modified server/domains/events/images.ts; bun run typecheck has one error only in concurrently modified app/pages/events/[slug]/index.vue; bun run test:integration has 385 passing tests and four unrelated event-image failures. No remote database, test environment, deployment, or push was used. This task does not modify server/auth/**; actor, consent, and authorization readers must explicitly request strong consistency when they are not replica-eligible.

Independent Luna review found that commit c5b5665c defaulted all GET requests to replica consistency, left six HTTP handlers using the raw D1 binding outside the request session, did not model stale replica visibility, retained a session-bypassing appDb escape hatch, and emitted bookmarks through two owners. The task is reopened until these structural issues are corrected.

Corrective verification 2026-08-19: strong HTTP default and explicit replica opt-in are covered by request-scoped integration/unit tests; all server/api and server/routes raw binding calls are removed and the source boundary test is green; the Nitro bookmark hook covers API/raw success/error; stale-replica and bookmark visibility are proven; HTTP injection is rejected. bun run lint passed; bun run typecheck passed; bun run test:unit passed 129 files/942 tests; bun run test:integration passed 31 files/397 tests. Targeted BDD public event-discovery and authenticated-session run had 4 passes and 6 failures at the saved-session artifact precondition because concurrent uncommitted BDD/session-state work left only one persona artifact; no D1-session assertion failed. DOD #3 remains unchecked pending that concurrent fixture state. No remote database, test environment, deployment, or push was used.

Corrective pass requested: make HTTP database access structurally non-injectable, replace generic replica options with a narrowly allowlisted public-replica helper, test the actual Nitro bookmark hook once across API/raw success/error paths, assert one session id across Drizzle/raw/batch operations, and account for fake-D1 infrastructure writes. Keep the task In Progress until full local validation.

Implementation research complete: current escape hatches are public H3 appDb/appDbAccess state, generic replica options, a test-harness finally wrapper, and untracked fake-D1 direct binding writes. Corrective implementation is scoped to the database client/types, local binding middleware, test harness/fake-D1, boundary/session tests, and terse D1 docs; auth/bootstrap work remains untouched.

Final local validation 2026-08-19: bun run lint, bun run typecheck, bun run test:unit (129 files/946 tests), bun run test:integration (32 files/400 tests), and bun run test:bdd (all suites) passed. No remote database, test/prod URL, deployment, or push was used. Task remains In Progress pending parent review.

Adversarial review of 5d6fd339 found two P1 structural gaps: getPublicReplicaDatabase is used by the mutable private/no-store platform-default-image settings route, and exported database constructors/resolvers/setDatabase remain reachable from shared production modules while the source test scans only route directories. The correction remains In Progress until both are closed and the full local validation is rerun.

Fresh corrective scope requested after 5d6fd339 and 7858c1fb. Do not touch server/api/public/platform/event-default-background-image.get.ts or client/bootstrap UI. User requires the exact fake-D1 CTE regression, removal of no-op strong options and all direct callers, production-tree verification for public-replica remnants, and handled sendRedirect/sendNoContent bookmark coverage through the actual Nitro hook where possible.

Fresh corrective verification: fake-D1 now parses leading comments/quoted tokens and resolves the top-level statement keyword after CTE bodies; the simplified-claiming INSERT ... WITH ... SELECT regression records isWrite:true, advances to test-bookmark-2, stays invisible to an unbookmarked stale read, and is visible to a bookmark-anchored read. Removed StrongDatabaseAccessOptions and all direct strong option callers. Production server-tree replica search is clean and both canonical D1 docs now describe strong-only HTTP access. The real H3 harness was exercised for handled responses: sendRedirect/sendNoContent mark the event handled before onBeforeResponse, so no coverage was added and no parallel production hook was introduced. Focused D1 integration (2 files/10 tests), targeted changed-file ESLint, and full elevated integration (32 files/399 tests) passed. Full lint has four unrelated concurrent app/test errors; typecheck has one unrelated app error; full unit has 125 passing files/939 tests and 4 unrelated app failures; BDD ran with port 3100 free and reached 38 passed/23 failures, dominated by concurrent media/server state and connection refusal. No remote DB, URL, deployment, or push used.

Independent handoff verification: focused integration for fake-D1, request-scoped sessions, and actor topology passed 3 files/14 tests; targeted ESLint passed; git diff --check and the full production-server replica/no-op symbol scan passed. HEAD is 963a657f and remains unpushed. The task stays In Progress because full lint/typecheck/unit and BDD include unrelated concurrent app/media failures; full integration passed 32 files/399 tests.

Adversarial review of 963a657f found a P1 boundary leak: createSessionDatabaseBinding spreads the raw D1 binding into Drizzle, so database.$client.withSession remains reachable. No current handler uses it, but the returned application database can bypass the request-scoped session/bookmark boundary. Fresh corrective pass required: strengthen AGENTS/docs and close the binding exposure with a boundary regression.

Follow-up review of 9c86ae87: the raw binding and withSession leak is closed, but AppDatabase still exposes a sanitized $client.prepare/batch. This remains an architectural layering violation because raw request-session operations must be reachable only through getDatabaseSession(event); fresh corrective work will remove the public $client surface while preserving database.batch and query behavior.

Final corrective scope after 9c86ae87: the public AppDatabase type and runtime must not expose Drizzle `$client` at all. The only raw request-session capability is getDatabaseSession(event); AppDatabase query/select/insert/update/delete/batch/execute must continue to use the same request session and bookmark. No media or app client/page files are in scope. Commit only scoped D1/task/docs files; no remote database, deployment, or push.

Final corrective verification: AppDatabase uses DrizzleD1Database without a public $client, runtime construction removes and prevents recreating the Drizzle property, and raw binding/client/session types are not re-exported from the HTTP database module. Runtime/type/source-boundary regressions and same-session Drizzle query/execute/batch coverage pass. bun run lint, bun run typecheck, bun run test:unit (130 files/954 tests), bun run test:integration (32 files/399 tests with elevated local Wrangler permissions), bun run test:bdd (62 non-destructive plus 2 destructive tests), and git diff --check pass. No push, deployment, remote URL, or remote D1 access.

Adversarial review of 42ff9c86 found two P1s: deleting the top-level Drizzle `$client` leaves database.session.client and query-builder session objects reachable, and allowlisted queue/recovery helpers can construct standalone non-HTTP databases from HTTP-triggered paths. The next corrective pass must close both structurally, preserve request-session/bookmark behavior, and expand regressions beyond top-level `$client`.

Fresh corrective findings after independent review of 3abb881a/42ff9c86: top-level $client removal still leaves database.session/client, query-builder session objects, and mutable Drizzle internals reachable; HTTP startup recovery middleware 98/99 can still construct standalone databases through talk-proposal/email-queue and application/luma-sync fallbacks; mixed-module allowlists hide this path; source checks need production-tree reachability rather than literal route regexes. The implementation must be fail-closed, preserve real query/select/mutation/relational/batch/bookmark behavior, and keep raw request-session operations exclusive to getDatabaseSession(event). User-provided deployed evidence confirms authenticated /api/session returned HTTP 200 with X-D1-Bookmark; retain this as transport evidence, while local Nitro success/error/handled-response behavior remains to be verified.

Corrective implementation 2026-08-19: replaced the public Drizzle object with a private-target AppDatabase facade and capability membrane. Nested session/client/prepare/_prepare/stmt paths fail closed, Drizzle entity identity remains compatible with external helpers such as exists(), builder execute and database.batch remain usable, and ordinary arrays and rows remain transparent. Queue domain modules now require an explicit AppDatabase; HTTP recovery middleware passes getDatabase(event), while queue and scheduled plugins explicitly construct createNonHttpDatabase. The source-boundary test removes mixed queue-domain exemptions and mechanically verifies both call paths. Validation: focused unit 45 tests and focused D1 integration 11 tests passed; event-route integration 68 tests passed; bun run lint passed; bun run test:unit passed 136 files and 970 tests; bun run test:integration passed 32 files and 400 tests with elevated local Wrangler permissions; git diff --check passed. bun run typecheck reports only concurrent dirty app/components/account/events errors; BDD was skipped because port 3100 was occupied. No remote D1, URL, deployment, or push was used; DOD #3 remains unchecked for the unrelated typecheck errors and skipped BDD.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-08-19 18:51
---
Corrective pass committed as 7858c1fb. Removed exported HTTP escape hatches and replica access, isolated non-HTTP/test construction, widened the AST/source-boundary guard to all server production modules, and strengthened real Nitro bookmark/session/fake-D1 coverage. bun run lint, bun run typecheck, bun run test:unit (129 files/946 tests), and bun run test:integration (32 files/398 tests) pass. bun run test:bdd ran with localhost:3100 free and reached 60/61 first-phase passes; the remaining managed background-image check failed in concurrent TASK-432.6 media state, so this task remains In Progress. No remote DB, deployment, test URL, or push.
---

author: @codex
created: 2026-08-19 18:57
---
Fresh corrective pass scoped to fake-D1 writable CTE semantics, no-op strong API removal, public-replica verification, and handled-response bookmark coverage. Media route and client/bootstrap UI are out of scope.
---

author: @codex
created: 2026-08-19 19:25
---
Fresh corrective scope opened for the P1 raw D1 exposure through the returned Drizzle database $client. The next Luna pass must update persistent D1 guardrails and close the boundary without touching media or client/bootstrap UI.
---

author: @codex
created: 2026-08-19 19:35
---
The 9c86ae87 fix narrowed the binding but left a public sanitized $client. Fresh corrective pass will remove that public surface to satisfy the strong session accessor boundary.
---

author: @codex
created: 2026-08-19 19:42
---
Final corrective implementation requested: remove the public Drizzle $client surface, prove fail-closed runtime/type behavior and same-session Drizzle/raw/batch operations, and close the production source boundary. Keep pending only for the parent browser gate.
---

author: @codex
created: 2026-08-19 20:08
---
Reopened after independent review: 42ff9c86 is not final because nested Drizzle session/client capabilities and HTTP-triggered non-HTTP fallback construction remain reachable. Fresh Luna pass must update the implementation and tests without touching media or app client/page files.
---

author: @codex
created: 2026-08-19 20:36
---
Fresh corrective implementation requested after review of 3abb881a/42ff9c86. Scope is D1 facade, HTTP recovery boundaries, source/runtime tests, and terse guardrails only; do not touch media or TASK-432.5.1 files. Worker must commit locally without pushing; parent coordinates CI snapshots.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Closed TASK-432.4 nested D1 capability and HTTP queue-recovery boundaries. AppDatabase is a private Drizzle facade with fail-closed nested capability paths, safe Drizzle helper identity, transparent result shapes, builder execute, and same-session batch/query behavior; HTTP recovery receives getDatabase(event), and non-HTTP construction is limited to explicit queue or scheduled plugins with source-boundary coverage. Verified with lint, 136 unit files and 970 tests, 32 integration files and 400 tests, focused capability/result/session regressions, and git diff --check. Task remains In Progress because concurrent dirty app typecheck errors remain and BDD was skipped due port 3100 occupancy. No push or remote access.
<!-- SECTION:FINAL_SUMMARY:END -->
