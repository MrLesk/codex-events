---
id: TASK-303.1
title: Extract server hackathon domain module
status: Done
assignee:
  - Codex
created_date: '2026-04-29 17:31'
updated_date: '2026-04-29 17:33'
labels:
  - architecture
  - server
  - refactor
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
modified_files:
  - server/domains/hackathons/index.ts
  - server/domains/hackathons/lifecycle-guard.ts
  - server/domains/applications/index.ts
  - server/utils/hackathon-management.ts
  - server/utils/lifecycle-guard.ts
  - tests/unit/server/domains/hackathons/index.test.ts
  - tests/unit/server/utils/hackathon-management.test.ts
parent_task_id: TASK-303
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Move hackathon lifecycle and management logic out of generic server utilities into a server hackathons domain module. Preserve existing API behavior while making the server boundary clearer: route handlers should depend on hackathon domain code rather than generic utility files.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Hackathon management and lifecycle guard logic live under a server hackathons domain module rather than generic server utilities.
- [x] #2 Server routes and other callers import the hackathon domain module directly, with no runtime compatibility aliases for the old utility paths.
- [x] #3 Tests covering hackathon management/lifecycle behavior are moved or updated to match the new domain layout.
- [x] #4 The refactor preserves API behavior and passes required validation: lint, typecheck, and unit tests.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect current imports and tests for hackathon management and lifecycle guard utilities.
2. Move hackathon management into server/domains/hackathons/index.ts and lifecycle guard into server/domains/hackathons/lifecycle-guard.ts, matching the existing server/domains/applications pattern.
3. Update all server/tests imports to use the new domain paths without old-path aliases.
4. Move/update unit tests to the matching tests/unit/server/domains/hackathons location.
5. Run targeted tests, then bun run lint, bun run typecheck, and bun run test:unit before finalizing.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Moved hackathon management and lifecycle guard into server/domains/hackathons using the existing server/domains/applications entrypoint pattern. All old #server/utils/hackathon-management and #server/utils/lifecycle-guard imports were removed rather than preserved with compatibility aliases.

Validation passed: bunx vitest run tests/unit/server/domains/hackathons/index.test.ts; bun run lint; bun run typecheck; bun run test:unit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Moved hackathon management and lifecycle guard logic out of generic server utilities into server/domains/hackathons. Updated server route handlers, server utility callers, and the applications domain to depend on the hackathons domain paths directly, with no old-path compatibility wrapper. Moved the hackathon management unit coverage to tests/unit/server/domains/hackathons/index.test.ts.

Validation passed: bunx vitest run tests/unit/server/domains/hackathons/index.test.ts; bun run lint; bun run typecheck; bun run test:unit. Canonical docs and setup docs were confirmed unchanged because this is a behavior-preserving module-boundary refactor.
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
