---
id: TASK-292.1
title: Complete Nuxt 4.3 server import and error conventions
status: Done
assignee:
  - Codex
created_date: '2026-04-25 22:20'
updated_date: '2026-04-25 22:22'
labels:
  - nuxt
  - server
dependencies: []
references:
  - 'https://nuxt.com/blog/v4-3'
documentation:
  - docs/tech-stack.md
parent_task_id: TASK-292
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Finish the mechanical server-side Nuxt convention cleanup that began in TASK-291. Server code should use Nuxt's #server alias for imports inside server/ and should avoid deprecated H3 error option names where changing them does not alter the public API contract.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Server files no longer use deep relative imports for imports that can be expressed through #server, excluding cases where a relative import is intentionally local to the same folder and clearer.
- [x] #2 Server createError calls use status/statusText instead of deprecated statusCode/statusMessage where the object is passed to H3 createError.
- [x] #3 Project tests and Vitest alias configuration continue to resolve #server imports.
- [x] #4 No app/shared code imports #server-only modules.
- [x] #5 Validation passes: bun run lint, bun run typecheck, and bun run test:unit.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Implementation plan:
1. Inventory server-side relative imports and H3 createError usages with ripgrep.
2. Apply a mechanical import rewrite for server/ files from deep relative server imports to #server imports, preserving same-folder relative imports when they are clearly local.
3. Rewrite H3 createError option objects in server/ from statusCode/statusMessage to status/statusText while leaving custom ApiError/statusCode domain objects unchanged.
4. Verify app/shared do not import #server and Vitest aliases still cover #server.
5. Run lint, typecheck, unit tests, update acceptance criteria/final summary, then commit TASK-292.1 separately with its Backlog file.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented server import convention cleanup by rewriting deep server-relative imports to #server across server/ while leaving shared imports as relative because they target shared/ outside the #server boundary. Verified no app/shared imports #server and no server createError call uses deprecated statusCode/statusMessage option keys. Validation passed: bun run lint, bun run typecheck, bun run test:unit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Rewrote server-internal relative imports to Nuxt's #server alias across server/ and confirmed H3 createError usage is already on status/statusText. Shared imports remain relative because they target shared/ rather than server/. Validation passed with lint, typecheck, and unit tests.
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
