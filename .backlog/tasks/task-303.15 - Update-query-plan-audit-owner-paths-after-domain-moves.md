---
id: TASK-303.15
title: Update query plan audit owner paths after domain moves
status: Done
assignee: []
created_date: '2026-04-29 18:11'
updated_date: '2026-04-29 18:11'
labels:
  - architecture
  - tools
  - refactor
dependencies: []
documentation:
  - docs/database-query-plan-audit.md
modified_files:
  - tools/d1/query-plan-audit.ts
parent_task_id: TASK-303
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update D1 query-plan audit owner metadata so optimization tooling points at the current domain module paths after the server domain moves.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Query-plan owner strings reference current server domain module paths instead of removed server/utils business modules.
- [x] #2 Stale server/utils owner references for moved business modules are removed from docs and tooling.
- [x] #3 Required validation passes: bun run lint, bun run typecheck, and bun run test:unit.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated D1 query-plan audit owner metadata to reference the current server domain module paths for applications, judging, hackathons, outcomes, and prize redemptions. Confirmed stale server/utils owner references for moved business modules are gone from docs and tooling. Validation passed: bun run lint, bun run typecheck, and bun run test:unit.
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
