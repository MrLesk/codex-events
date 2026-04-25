---
id: TASK-292.5
title: Create measured D1 query-plan audit for release hot paths
status: Done
assignee:
  - Boyle
created_date: '2026-04-25 22:20'
updated_date: '2026-04-25 22:29'
labels:
  - database
  - d1
dependencies: []
documentation:
  - docs/schema-outline.md
  - docs/api-surface.md
parent_task_id: TASK-292
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Produce a measured database review artifact for the release hot paths rather than adding speculative indexes. The output should make it clear which representative queries are already covered and which need follow-up indexes or query rewrites.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A repo-local query-plan audit document or script records representative D1/SQLite EXPLAIN QUERY PLAN checks for account hackathons, admin applications, judging assignments, public hackathon detail, public projects/winners, audit logs, and prize redemptions.
- [x] #2 The audit distinguishes measured findings from recommendations.
- [x] #3 Any new index migration is added only when the measured plan shows a scan or temp sort on a release hot path and the index has a clear query owner.
- [x] #4 Schema tests are updated if indexes are added.
- [x] #5 Validation passes: bun run lint, bun run typecheck, and bun run test:unit.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Implementation plan:
1. Add a small D1/SQLite query-plan audit runner under tools/d1/ that uses the repo's migrated test D1 database surface.
2. Cover representative release hot paths for account hackathons, admin applications, judging assignments, public hackathon detail, public projects/winners, audit logs, and prize redemptions.
3. Generate docs/database-query-plan-audit.md from measured EXPLAIN QUERY PLAN output and link it from docs/README.md.
4. Distinguish measured plan findings from recommendations and avoid schema/index changes in this task.
5. Validate with the audit script, lint, typecheck, and unit tests before commit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Worker produced `tools/d1/query-plan-audit.ts`, `docs/database-query-plan-audit.md`, and a docs index link. Coordinator review confirmed the script runs against the migrated test D1-compatible SQLite database, records measured EXPLAIN QUERY PLAN details, and separates measured findings from owner-scoped recommendations. No schema/index migration was added because this task is an audit artifact only. Validation passed: bun tools/d1/query-plan-audit.ts --write, bun run lint, bun run typecheck, bun run test:unit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a repeatable D1 query-plan audit script and generated database-query-plan-audit documentation covering release hot paths. The audit records measured EXPLAIN QUERY PLAN output and recommendations without adding speculative indexes. Validation passed with the audit script, lint, typecheck, and unit tests.
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
