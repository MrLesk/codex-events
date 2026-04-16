---
id: TASK-225
title: Hotfix D1 parameter-limit failure on admin applications endpoint
status: In Progress
assignee:
  - codex
created_date: '2026-04-16 19:40'
updated_date: '2026-04-16 19:41'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The production admin applications endpoint for the Vienna hackathon fails when computing admin withdrawal availability for a large application set. The current bulk lookup sends too many bound parameters to Cloudflare D1 in a single query against team membership data. Update the applications listing path so large hackathons stay within D1 query parameter limits while preserving the existing admin-withdrawal data in the response.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Admin applications list succeeds for hackathons with more than 100 application user IDs.
- [ ] #2 Withdrawal-availability enrichment keeps all D1 queries within Cloudflare D1 bound-parameter limits.
- [ ] #3 Regression test coverage exercises the large-application-list path and prevents the oversized-query failure.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update listAdminApplicationWithdrawalAvailabilityByApplicationId in server/utils/applications.ts to batch D1 lookups that currently pass large userId/teamId arrays into inArray() clauses.
2. Keep the existing response shape and admin withdrawal availability semantics unchanged.
3. Add regression coverage in tests/integration/server/api/application-routes.test.ts for a hackathon with more than 100 applications so the applications list path succeeds without oversized D1 queries.
4. Run bun run lint, bun run typecheck, and bun run test:unit before handoff; document docs/config impact and remaining risks in the task summary.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Production tail shows GET /api/hackathons/hackathon_codex_vienna_2026_04_18/applications failing from the Vienna participants tab. Logged query shape includes a large IN (...) against team_members.user_id. Vienna production currently has 147 applications, exceeding Cloudflare D1's 100 bound-parameter query limit.
<!-- SECTION:NOTES:END -->

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
