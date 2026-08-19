---
id: TASK-432.4
title: Add request-scoped D1 sessions and consistency bookmarks
status: In Progress
assignee:
  - '@luna-d1'
created_date: '2026-08-19 06:22'
updated_date: '2026-08-19 19:15'
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
1. Preserve the strong-only request-scoped D1 session and single Nitro bookmark owner from 5d6fd339/7858c1fb.
2. Correct fake-D1 SQL write classification for writable CTEs, including the simplified-claiming import INSERT ... WITH ... SELECT shape; record writes, advance bookmarks, and prove bookmarked reads observe the write.
3. Remove StrongDatabaseAccessOptions and all no-op consistency arguments so getDatabase(event) and getDatabaseSession(event) are the only production strong APIs.
4. Verify the production server tree contains no public-replica option/accessor/path; leave the media-owned platform image route untouched and report any removed-symbol import.
5. Exercise the actual Nitro bookmark hook for sendRedirect and sendNoContent when locally possible, preserving one production hook owner.
6. Run lint, typecheck, unit, integration, and BDD only when the local port is free; commit only the scoped D1/task files, with no push, deployment, or remote database.
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
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fresh corrective work fixed fake-D1 writable-CTE classification, removed StrongDatabaseAccessOptions and all no-op strong callers, verified the entire production server tree has no public-replica access, and updated the canonical D1 docs to strong-only HTTP access. The exact simplified-claiming INSERT ... WITH ... SELECT shape now advances fake-D1 bookmarks and is visible to bookmark-anchored reads while stale unbookmarked reads remain behind. The real H3 harness confirmed sendRedirect/sendNoContent bypass beforeResponse when handled, so no parallel production hook was added. Focused D1 tests, targeted changed-file ESLint, and full elevated integration (32 files/399 tests) passed. Full lint, typecheck, unit, and BDD were run but retain unrelated concurrent app/media/server failures; task remains In Progress pending shared-worktree validation.

Local corrective commit 963a657f is ready for review; no push, deployment, remote URL, or remote database access was used.
<!-- SECTION:FINAL_SUMMARY:END -->
