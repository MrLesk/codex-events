---
id: TASK-432.4
title: Add request-scoped D1 sessions and consistency bookmarks
status: Done
assignee:
  - '@luna-d1'
created_date: '2026-08-19 06:22'
updated_date: '2026-08-19 06:51'
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
- [x] #2 Read-only requests default to low-latency replica-eligible consistency and mutations can continue from an incoming bookmark
- [x] #3 Responses expose the next bookmark through one documented transport without leaking it into domain contracts
- [x] #4 Local fake-D1 and integration support exercise the same application-facing database abstraction
- [x] #5 Deployment guidance documents enabling read replication separately from checked-in binding configuration
- [x] #6 Tests cover session reuse, bookmark propagation, read-only requests, and write-followed-by-read behavior
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
1. Extend server/database/client.ts with typed request-scoped AppDatabaseAccess, D1 Sessions constraints, incoming/outgoing X-D1-Bookmark transport, and a single Drizzle client built over one session; reject conflicting consistency selections within a request.
2. Store the request access in H3 context, emit the latest bookmark from the API handler and Nitro response hook, and keep explicit raw createDatabase/setDatabase injection available only for non-request test/queue setup.
3. Update the local fake-D1 and API harness so withSession(), bookmarks, consistency starts, and per-request client creation are exercised without remote D1.
4. Add integration coverage for request reuse, read/mutation constraints, incoming and outgoing bookmarks, and write-followed-by-read visibility.
5. Document the X-D1-Bookmark transport and operator-controlled D1 read-replication enablement; verify Wrangler generation needs no checked-in replication field.
6. Run focused local integration tests, then bun run lint, bun run typecheck, bun run test:unit, bun run test:integration, inspect the scoped diff, and make one focused local commit without pushing.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented request-scoped AppDatabaseAccess over one D1 session with typed consistency selection, bookmark transport, conflict enforcement, API/Nitro response emission, fake-D1 session/bookmark behavior, and per-request integration harness coverage.
Focused session integration tests, related database tests, and typecheck pass. Full integration reaches 385 passing tests; 4 unrelated failures remain in the concurrently modified event-image worker files.

Final verification: focused request-scoped integration, related database/API integration, scoped server TypeScript, scoped ESLint, unit (126 files/932 tests), and deployment config generator (8 tests) passed locally against fake D1 only. Full bun run lint has three errors only in concurrently modified server/domains/events/images.ts; bun run typecheck has one error only in concurrently modified app/pages/events/[slug]/index.vue; bun run test:integration has 385 passing tests and four unrelated event-image failures. No remote database, test environment, deployment, or push was used. This task does not modify server/auth/**; actor, consent, and authorization readers must explicitly request strong consistency when they are not replica-eligible.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented one request-scoped typed D1 session and shared Drizzle client per HTTP request, with explicit replica/strong constraints, incoming and outgoing X-D1-Bookmark transport, local fake-D1 parity, and deployment guidance for operator-controlled read replication. Verified with focused integration coverage for reuse, constraints, bookmarks, and write-followed-by-read behavior, plus scoped type/lint and unit checks; repository-wide failures are isolated to concurrent workers' image/UI files.
<!-- SECTION:FINAL_SUMMARY:END -->
