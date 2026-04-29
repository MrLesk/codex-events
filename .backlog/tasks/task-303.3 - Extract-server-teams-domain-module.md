---
id: TASK-303.3
title: Extract server teams domain module
status: Done
assignee:
  - Codex
created_date: '2026-04-29 17:35'
updated_date: '2026-04-29 17:36'
labels:
  - architecture
  - server
  - refactor
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
modified_files:
  - server/domains/teams/index.ts
  - server/utils/team-formation.ts
  - server/utils/submissions.ts
  - tests/unit/server/domains/teams/index.test.ts
  - tests/unit/server/utils/team-formation.test.ts
parent_task_id: TASK-303
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Move team formation, team membership, and join-request server logic out of generic server utilities into a teams domain module. Preserve route behavior while making the server team boundary explicit.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Team formation, membership, and join-request logic lives under a server teams domain module rather than generic server utilities.
- [x] #2 Team-related routes and submission callers import the teams domain module directly, with no runtime compatibility alias for the old utility path.
- [x] #3 Tests covering team formation behavior are moved or updated to match the new domain layout.
- [x] #4 The refactor preserves behavior and passes required validation: lint, typecheck, unit tests, and relevant team formation integration tests.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Move server/utils/team-formation.ts to server/domains/teams/index.ts, matching the existing domain entrypoint pattern.
2. Update team routes and submissions domain callers from #server/utils/team-formation or relative team-formation imports to #server/domains/teams.
3. Move the team formation unit test to tests/unit/server/domains/teams/index.test.ts and update imports.
4. Run targeted unit and integration tests for teams, then bun run lint, bun run typecheck, and bun run test:unit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Moved team formation, team membership, and join-request domain logic to server/domains/teams. Updated team routes and submissions imports to the domain path; no old team-formation utility path remains.

Validation passed: bunx vitest run tests/unit/server/domains/teams/index.test.ts; bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/team-formation-routes.test.ts; bun run lint; bun run typecheck; bun run test:unit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Moved server team formation, membership, and join-request logic from server/utils/team-formation.ts to server/domains/teams/index.ts. Updated team routes and submissions callers to import the teams domain directly, and moved the unit coverage to tests/unit/server/domains/teams/index.test.ts.

Validation passed: bunx vitest run tests/unit/server/domains/teams/index.test.ts; bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/team-formation-routes.test.ts; bun run lint; bun run typecheck; bun run test:unit. Docs/config were confirmed unchanged because this is behavior-preserving module-boundary work.
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
