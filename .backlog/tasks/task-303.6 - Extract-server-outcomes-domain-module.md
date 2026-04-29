---
id: TASK-303.6
title: Extract server outcomes domain module
status: Done
assignee:
  - Codex
created_date: '2026-04-29 17:40'
updated_date: '2026-04-29 17:41'
labels:
  - architecture
  - server
  - refactor
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
  - docs/api-surface.md
modified_files:
  - server/domains/outcomes/index.ts
  - server/utils/shortlist.ts
  - server/utils/hackathon-participation.ts
  - server/utils/prize-redemptions.ts
  - server/utils/hackathon-outcome-email-queue.ts
  - tests/unit/server/domains/outcomes/index.test.ts
  - tests/unit/server/utils/shortlist.test.ts
parent_task_id: TASK-303
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Move shortlist, leaderboard, final deliberation, winner visibility, and completed outcome cache logic out of generic server utilities into an outcomes domain module. Preserve route behavior while making the post-judging outcome boundary explicit.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Shortlist, leaderboard, final deliberation, winner visibility, published project, and completed outcome cache logic lives under a server outcomes domain module rather than generic server utilities.
- [x] #2 Outcome-related routes and dependent callers import the outcomes domain module directly, with no runtime compatibility alias for the old utility path.
- [x] #3 Tests covering shortlist/outcome behavior are moved or updated to match the new domain layout.
- [x] #4 The refactor preserves behavior and passes required validation: lint, typecheck, unit tests, and relevant outcome route integration tests.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Move server/utils/shortlist.ts to server/domains/outcomes/index.ts, using the canonical docs language that groups shortlist/final deliberation/winners as outcome surfaces.
2. Update outcome routes, lifecycle action routes, prize redemption, hackathon participation, and outcome email queue imports to #server/domains/outcomes.
3. Move the shortlist unit test to tests/unit/server/domains/outcomes/index.test.ts and update relative imports.
4. Run targeted outcome unit and integration tests, then bun run lint, bun run typecheck, and bun run test:unit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Moved shortlist, leaderboard, final deliberation, winners, published projects, and completed outcome cache logic to server/domains/outcomes. Updated outcome routes, lifecycle action routes, prize redemption, hackathon participation, and outcome email queue imports; no old shortlist utility path remains.

Validation passed: bunx vitest run tests/unit/server/domains/outcomes/index.test.ts; bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/outcome-routes.test.ts; bun run lint; bun run typecheck; bun run test:unit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Moved shortlist, leaderboard, final deliberation, winner visibility, published project, and completed outcome cache logic from server/utils/shortlist.ts to server/domains/outcomes/index.ts. Updated outcome-related routes and dependent callers to import the outcomes domain directly, and moved unit coverage to tests/unit/server/domains/outcomes/index.test.ts.

Validation passed: bunx vitest run tests/unit/server/domains/outcomes/index.test.ts; bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/outcome-routes.test.ts; bun run lint; bun run typecheck; bun run test:unit. Docs/config were confirmed unchanged because this is behavior-preserving module-boundary work and the module name follows canonical outcome language.
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
