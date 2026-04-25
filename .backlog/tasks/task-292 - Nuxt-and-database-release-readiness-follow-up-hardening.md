---
id: TASK-292
title: Nuxt and database release-readiness follow-up hardening
status: Done
assignee:
  - Codex
created_date: '2026-04-25 22:19'
updated_date: '2026-04-25 22:31'
labels:
  - nuxt
  - database
  - release-readiness
dependencies: []
references:
  - 'https://nuxt.com/blog/v4-3'
  - 'https://nuxt.com/blog/v4-4'
documentation:
  - docs/README.md
  - docs/domain-model.md
  - docs/tech-stack.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Follow-up release-readiness work after the first Nuxt 4/database hardening pass. The goal is to make the codebase easier for strict Nuxt/database reviewers to evaluate by finishing framework convention cleanup, reducing oversized component surfaces, adding measured database review artifacts, and using current Nuxt 4 features where they improve production behavior without changing product rules.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Follow-up work is split into independently reviewable subtasks with clear ownership and no overlapping write scopes.
- [x] #2 Each completed subtask includes its Backlog task update in the same commit as the related code or documentation changes.
- [x] #3 Required validation passes before a completed subtask is committed: bun run lint, bun run typecheck, and bun run test:unit unless the subtask explicitly justifies a narrower validation scope.
- [x] #4 The final state keeps canonical product behavior aligned with docs/ and does not introduce runtime compatibility fallbacks.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Coordinator plan:
1. Keep TASK-292.1 on the critical path locally because it touches broad server import/error conventions.
2. Run TASK-292.2, TASK-292.3, TASK-292.4, and TASK-292.5 in parallel only where write scopes do not overlap.
3. Workers must not commit or mark tasks Done; the coordinator reviews, validates, finalizes Backlog metadata, and commits each task separately.
4. Commit order will follow completed review order, keeping each task's Backlog file with its code/docs changes.
5. Parent TASK-292 closes only after child tasks are reviewed, validation passes, and the final parent Backlog update is committed.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed the release-readiness follow-up batch across five independently scoped child tasks. TASK-292.1 cleaned server import/error conventions; TASK-292.2 and TASK-292.3 extracted reusable admin/settings components; TASK-292.4 applied targeted Nuxt 4.4 route configuration and accessibility improvements; TASK-292.5 added a measured D1 query-plan audit script and canonical audit document. The work stayed aligned with docs/, avoided runtime compatibility fallbacks, and kept each child task committed with its Backlog metadata. Final validation passed: bun tools/d1/query-plan-audit.ts --write, bun run lint, bun run typecheck, and bun run test:unit.
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
