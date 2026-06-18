---
id: TASK-412
title: Ban runtime inArray and fix large application staff lookup
status: Done
assignee:
  - '@codex'
created_date: '2026-06-18 16:32'
updated_date: '2026-06-18 16:43'
labels:
  - backend
  - bug
dependencies: []
priority: high
ordinal: 91000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Production admin participant pages can request 100 applications. The event-staff marker query used a runtime Drizzle inArray membership lookup, exceeding D1's 100-bound-parameter limit. Runtime source should not use WHERE IN-style Drizzle membership queries because agents copy those patterns and D1 limits make them fragile.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 GET /api/events/:eventId/applications?page=1&page_size=100 succeeds when the returned page contains 100 application users
- [x] #2 Staff markers are still populated correctly for applications whose users have event staff role assignments
- [x] #3 bun run lint enforces the runtime inArray import ban while tests may still import inArray when useful
- [x] #4 Runtime source under server/ and app/ has no Drizzle inArray imports or usages
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add an AGENTS.md database-query guardrail banning runtime WHERE IN / Drizzle inArray patterns.
2. Add a no-restricted-imports rule to existing ESLint config for server/ and app/ runtime files.
3. Replace runtime inArray usages with joins, per-row point lookups, or explicit OR predicates while preserving API contracts.
4. Keep tests allowed to use inArray and extend the large applications-page test for staff marker behavior.
5. Run targeted integration validation plus required lint, typecheck, and unit tests before finalizing.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented the guardrail by adding the AGENTS.md runtime query rule and an ESLint no-restricted-imports rule scoped to server/ and app/. Replaced all runtime Drizzle inArray usages with joins, point lookups, or explicit OR predicates. The large applications list now derives isEventStaff from a left join instead of a second membership lookup. Validation passed: bun run lint; bun run typecheck; bun run test:unit; bun run test:integration; bun run test:integration -- tests/integration/server/api/application-routes.test.ts; git diff --check.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added an agent-visible runtime query ban for WHERE IN / Drizzle inArray, enforced it through existing lint, removed runtime inArray usage, and fixed the production applications page staff marker query with a join. Verified lint, typecheck, unit tests, full integration tests, targeted application-route integration, and diff whitespace.
<!-- SECTION:FINAL_SUMMARY:END -->

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
