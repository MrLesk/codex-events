---
id: TASK-303.4
title: Extract server submissions domain module
status: Done
assignee:
  - Codex
created_date: '2026-04-29 17:37'
updated_date: '2026-04-29 17:38'
labels:
  - architecture
  - server
  - refactor
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
modified_files:
  - server/domains/submissions/index.ts
  - server/utils/submissions.ts
  - server/utils/hackathon-participation.ts
  - tests/unit/server/domains/submissions/index.test.ts
  - tests/unit/server/utils/submissions.test.ts
parent_task_id: TASK-303
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Move submission lifecycle, validation, serialization, monitor, and route context logic out of generic server utilities into a submissions domain module. Preserve route behavior while making the submissions boundary explicit and dependent on the teams domain where needed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Submission lifecycle, validation, serialization, and monitor logic lives under a server submissions domain module rather than generic server utilities.
- [x] #2 Submission routes and hackathon participation callers import the submissions domain module directly, with no runtime compatibility alias for the old utility path.
- [x] #3 Tests covering submission behavior are moved or updated to match the new domain layout.
- [x] #4 The refactor preserves behavior and passes required validation: lint, typecheck, unit tests, and relevant submission route integration tests.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Move server/utils/submissions.ts to server/domains/submissions/index.ts.
2. Update submission routes and hackathon participation imports from #server/utils/submissions or relative submissions imports to #server/domains/submissions.
3. Move the submissions unit test to tests/unit/server/domains/submissions/index.test.ts and update relative imports.
4. Run targeted submission unit and integration route tests, then bun run lint, bun run typecheck, and bun run test:unit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Moved submission lifecycle, validation, serialization, and monitor logic to server/domains/submissions. Updated submission routes and hackathon participation imports; no old submissions utility path remains.

Validation passed: bunx vitest run tests/unit/server/domains/submissions/index.test.ts; bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/submission-routes.test.ts; bun run lint; bun run typecheck; bun run test:unit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Moved submission lifecycle, validation, serialization, monitor, and route context logic from server/utils/submissions.ts to server/domains/submissions/index.ts. Updated submission routes and hackathon participation callers to import the submissions domain directly, and moved unit coverage to tests/unit/server/domains/submissions/index.test.ts.

Validation passed: bunx vitest run tests/unit/server/domains/submissions/index.test.ts; bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/submission-routes.test.ts; bun run lint; bun run typecheck; bun run test:unit. Docs/config were confirmed unchanged because this is behavior-preserving module-boundary work.
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
