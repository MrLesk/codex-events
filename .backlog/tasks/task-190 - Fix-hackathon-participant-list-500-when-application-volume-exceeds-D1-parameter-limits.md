---
id: TASK-190
title: >-
  Fix hackathon participant list 500 when application volume exceeds D1
  parameter limits
status: Done
assignee:
  - '@codex'
created_date: '2026-04-05 19:42'
updated_date: '2026-04-05 19:43'
labels:
  - bug
  - production
  - admin
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The production participants page for large hackathons returns HTTP 500 because GET /api/hackathons/:hackathonId/applications loads all applications and then performs a single users-by-id lookup with an oversized IN list. The hotfix should preserve the current API response shape while making the related-user lookup safe for large participant counts in D1.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 GET /api/hackathons/:hackathonId/applications succeeds for large hackathons without exceeding D1 bound-parameter limits.
- [x] #2 The endpoint preserves the existing response shape, ordering, and user enrichment for participant records.
- [x] #3 Integration coverage includes a hackathon with enough applications to exercise the batched or otherwise parameter-safe related-user lookup.
- [x] #4 Required local validation passes or any limitation is documented.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Patch listHackathonApplications in server/utils/applications.ts to batch related user lookups by unique user IDs so the users query never exceeds D1 parameter limits while preserving current response ordering and enrichment.
2. Add an integration test in tests/integration/server/api/application-routes.test.ts that seeds more than 100 applications for one hackathon and verifies GET /api/hackathons/:hackathonId/applications still returns 200 with the expected participant rows.
3. Run focused validation for the updated integration and then the required repository checks: bun run lint, bun run typecheck, and bun run test:unit.
4. If validation passes, summarize the prod root cause and the hotfix scope in the task notes/final summary.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Production tail on April 5 2026 showed GET /api/hackathons/hackathon_codex_vienna_2026_04_18/applications failing in listHackathonApplications during the related users lookup: one oversized users.id IN (...) query exceeded D1 bound-parameter limits for large hackathons.

Implemented a narrow hotfix in server/utils/applications.ts that batches unique related user IDs in groups of 75 before hydrating participant cards, preserving the existing response shape and ordering.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Patched the hackathon participant list hot path so large hackathons no longer issue one oversized users-by-id lookup. In server/utils/applications.ts, listHackathonApplications now de-duplicates participant user IDs and fetches related users in batches of 75 before serializing the existing participant response shape, which avoids the D1 bound-parameter limit that was causing production 500s on GET /api/hackathons/:hackathonId/applications.

Added an integration regression in tests/integration/server/api/application-routes.test.ts that seeds 120 participant applications, verifies the route still returns 200 with user enrichment intact, and asserts the users lookup is split across multiple findMany calls. Validation passed with a focused integration run for the new regression plus bun run lint, bun run typecheck, and bun run test:unit. Canonical docs and runtime configuration were unchanged.
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
