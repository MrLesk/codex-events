---
id: TASK-432.4
title: Add request-scoped D1 sessions and consistency bookmarks
status: In Progress
assignee:
  - '@luna-d1'
created_date: '2026-08-19 06:22'
updated_date: '2026-08-19 17:52'
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
Introduce a shared database access path that can use Cloudflare D1 Sessions API and read replicas while preserving local D1 tests and explicit read-after-write semantics.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Each HTTP request obtains one shared database client backed by one logical D1 session
- [x] #2 Responses expose the next bookmark through one documented transport without leaking it into domain contracts
- [x] #3 Local fake-D1 and integration support exercise the same application-facing database abstraction
- [x] #4 Deployment guidance documents enabling read replication separately from checked-in binding configuration
- [x] #5 Tests cover session reuse, bookmark propagation, read-only requests, and write-followed-by-read behavior
- [x] #6 Replica consistency is explicit opt-in for vetted public reads; authenticated actor, consent, permission, and mutation paths default to strong consistency
- [x] #7 HTTP handlers cannot access the raw D1 binding and all prepared statements or batches participate in the request session and bookmark
- [x] #8 One global response hook owns bookmark emission for API, raw-route, success, and error responses
- [x] #9 The local fake-D1 can model a stale replica and proves that an unbookmarked read may be stale while a bookmarked read observes the write
- [x] #10 Direct database injection is restricted to explicit test or non-HTTP execution paths and cannot silently bypass request sessions
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
1. Keep the shared request-scoped Drizzle/D1 Sessions abstraction and X-D1-Bookmark transport, but make strong consistency the implicit default and require explicit replica opt-in for vetted public reads.
2. Expose the request session for raw prepare/batch work, migrate every server/api and server/routes raw D1 call, and add persistent AGENTS/source-test guardrails against raw binding access.
3. Make the Nitro beforeResponse plugin the sole bookmark emitter; remove handler-level emission and cover API success/error plus a raw route.
4. Keep direct appDb injection only for guarded non-HTTP test/infrastructure events so HTTP requests cannot bypass the request session.
5. Extend fake D1 with a deliberately stale replica snapshot and tests showing an unbookmarked read can miss a write while a bookmark-anchored read observes it.
6. Update canonical/request-topology docs, run all requested local validation including relevant BDD coverage, finalize objectively, and create one corrective local commit without push or deployment.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented request-scoped AppDatabaseAccess over one D1 session with typed consistency selection, bookmark transport, conflict enforcement, API/Nitro response emission, fake-D1 session/bookmark behavior, and per-request integration harness coverage.
Focused session integration tests, related database tests, and typecheck pass. Full integration reaches 385 passing tests; 4 unrelated failures remain in the concurrently modified event-image worker files.

Final verification: focused request-scoped integration, related database/API integration, scoped server TypeScript, scoped ESLint, unit (126 files/932 tests), and deployment config generator (8 tests) passed locally against fake D1 only. Full bun run lint has three errors only in concurrently modified server/domains/events/images.ts; bun run typecheck has one error only in concurrently modified app/pages/events/[slug]/index.vue; bun run test:integration has 385 passing tests and four unrelated event-image failures. No remote database, test environment, deployment, or push was used. This task does not modify server/auth/**; actor, consent, and authorization readers must explicitly request strong consistency when they are not replica-eligible.

Independent Luna review found that commit c5b5665c defaulted all GET requests to replica consistency, left six HTTP handlers using the raw D1 binding outside the request session, did not model stale replica visibility, retained a session-bypassing appDb escape hatch, and emitted bookmarks through two owners. The task is reopened until these structural issues are corrected.

Corrective verification 2026-08-19: strong HTTP default and explicit replica opt-in are covered by request-scoped integration/unit tests; all server/api and server/routes raw binding calls are removed and the source boundary test is green; the Nitro bookmark hook covers API/raw success/error; stale-replica and bookmark visibility are proven; HTTP injection is rejected. bun run lint passed; bun run typecheck passed; bun run test:unit passed 129 files/942 tests; bun run test:integration passed 31 files/397 tests. Targeted BDD public event-discovery and authenticated-session run had 4 passes and 6 failures at the saved-session artifact precondition because concurrent uncommitted BDD/session-state work left only one persona artifact; no D1-session assertion failed. DOD #3 remains unchecked pending that concurrent fixture state. No remote database, test environment, deployment, or push was used.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Corrected TASK-432.4: HTTP D1 access now defaults to strong consistency, with explicit replica opt-in for vetted public reads; all raw HTTP prepared statements and batches use the request session; one Nitro beforeResponse hook emits X-D1-Bookmark; HTTP database injection is rejected; and fake-D1 stale-replica/bookmark behavior is covered. AGENTS/docs and source-boundary tests preserve the constraints. Verified by bun run lint, bun run typecheck, bun run test:unit (129 files/942 tests), and bun run test:integration (31 files/397 tests). Targeted BDD reached 4 passes and 6 concurrent-fixture precondition failures, so DOD #3 remains unchecked and the task stays In Progress pending the shared BDD/session-state changes. No remote DB, deployment, or push.
<!-- SECTION:FINAL_SUMMARY:END -->
