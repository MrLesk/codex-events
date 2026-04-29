---
id: TASK-303.5
title: Extract server judging domain module
status: Done
assignee:
  - Codex
created_date: '2026-04-29 17:38'
updated_date: '2026-04-29 17:39'
labels:
  - architecture
  - server
  - refactor
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
modified_files:
  - server/domains/judging/index.ts
  - server/utils/judging.ts
  - server/utils/shortlist.ts
  - tests/unit/server/domains/judging/index.test.ts
  - tests/unit/server/utils/judging.test.ts
  - tests/integration/server/api/judging-routes.test.ts
parent_task_id: TASK-303
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Move judge assignment, scoring, pitch review, and judging-stage transition logic out of generic server utilities into a judging domain module. Preserve route behavior while making the competition judging boundary explicit.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Judge assignment, scoring, pitch review, and judging-stage transition logic lives under a server judging domain module rather than generic server utilities.
- [x] #2 Judging routes and dependent outcome/submission callers import the judging domain module directly, with no runtime compatibility alias for the old utility path.
- [x] #3 Tests covering judging behavior are moved or updated to match the new domain layout.
- [x] #4 The refactor preserves behavior and passes required validation: lint, typecheck, unit tests, and relevant judging route integration tests.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Move server/utils/judging.ts to server/domains/judging/index.ts.
2. Update judging/action routes, shortlist, and submission disqualification callers from #server/utils/judging or relative judging imports to #server/domains/judging.
3. Move the judging unit test to tests/unit/server/domains/judging/index.test.ts and update integration test imports.
4. Run targeted judging unit and integration tests, then bun run lint, bun run typecheck, and bun run test:unit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Moved judge assignment, scoring, pitch review, and judging-stage transition logic to server/domains/judging. Updated judging routes, lifecycle action routes, shortlist, and submission disqualification imports; no old judging utility path remains.

Validation passed: bunx vitest run tests/unit/server/domains/judging/index.test.ts; bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/judging-routes.test.ts; bun run lint; bun run typecheck; bun run test:unit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Moved judge assignment, scoring, pitch review, and judging-stage transition logic from server/utils/judging.ts to server/domains/judging/index.ts. Updated judging routes, lifecycle action routes, shortlist, and submission disqualification callers to import the judging domain directly, and moved unit coverage to tests/unit/server/domains/judging/index.test.ts.

Validation passed: bunx vitest run tests/unit/server/domains/judging/index.test.ts; bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/judging-routes.test.ts; bun run lint; bun run typecheck; bun run test:unit. Docs/config were confirmed unchanged because this is behavior-preserving module-boundary work.
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
