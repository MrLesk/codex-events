---
id: TASK-432.10.1
title: Make D1 replacement restore deterministic
status: Done
assignee:
  - '@luna-d1-restore'
created_date: '2026-08-20 23:56'
updated_date: '2026-08-21 00:31'
labels: []
dependencies: []
parent_task_id: TASK-432.10
priority: high
type: bug
ordinal: 148000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The first real test replacement proved that replaying a Cloudflare full D1 export into an empty replacement can fail before parent tables exist, and replaying data after migrations can fail because schema triggers synthesize rows such as primary auth identities. Replace the fragile manual restore step with a deterministic, recoverable operator path that preserves all product rows, migration state, constraints, and rollback safety without modifying or deleting the source database.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A checked-in operator command or precisely validated procedure restores a D1 export into an explicitly placed replacement without relying on Cloudflare export statement order
- [x] #2 Trigger-generated rows and cyclic/deferred relationships are handled without dropping legitimate secondary identities or other product data
- [x] #3 The restore verifies per-table row counts, foreign-key integrity, migration state, replacement identity, and observed placement before it permits binding switch guidance
- [x] #4 Tests cover command construction, fail-closed validation, rollback behavior, and representative trigger-created identity data without remote mutation
- [x] #5 The source database is never deleted or modified and the replacement remains an explicit operator-selected target
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [x] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [x] #6 Config and developer workflow docs were updated when setup changed
- [ ] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Ingest the trusted full source export with bun:sqlite using foreign-key enforcement off; introspect sqlite_schema, PRAGMA table_xinfo, and PRAGMA foreign_key_list, then emit deterministic INSERT OR IGNORE rows ordered by dependencies with deferred foreign keys.
2. Keep remote verification bounded: generate separate source, empty-target, and post-restore count files with at most four tables per file, plus independent FK, quick_check, migration, identity, placement, and size checks.
3. After replay, export the replacement and compare source/replacement canonical table, column, and row digests locally through bun:sqlite; fail closed on any mismatch. Generate or validate a temporary Wrangler config pinned to the explicit replacement name and UUID.
4. Add mocked command-runner/unit coverage and a bun:sqlite integration fixture for trigger-created primary plus explicit secondary identities and cyclic relationships.
5. Update the canonical placement/replacement runbook and run focused and required validation before committing only the approved files.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Review revision: exact-row SQL predicates are not scalable at 10,000 participants. Post-restore replacement export plus local SQLite canonical comparison is the source-of-truth row verification; remote SQL remains bounded count/FK/quick/migration/placement evidence.

Review revision implemented: removed matched-row SQL predicates. The tool now exports the replacement after replay and compares source/replacement canonical SHA-256 evidence from SQLite-quoted table rows; remote count queries remain capped at four tables per request. Focused unit (11) and integration (1) tests pass, including trigger primary/secondary identities, cycles, chunking, config pinning, placement, non-empty target, and canonical mismatch failures.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented tools/deploy/restore-d1-replacement.ts as a non-destructive, fail-closed operator restore path. Trusted full exports are ingested with Bun SQLite at runtime, replay is dependency-ordered with deferred foreign keys and INSERT OR IGNORE, remote count requests are capped at four tables, and post-restore source/replacement exports are compared through canonical SQLite row digests. Temporary replacement Wrangler config is generated or validated with the explicit replacement UUID; no binding switch, deploy, delete, or source write is performed. Updated docs/d1-placement-and-replacement.md and added mocked command-runner plus local SQLite trigger/cycle fixtures. Verified bun run lint, bun run typecheck, bun run test:unit (162 files, 1084 tests), bun run test:integration (44 files, 468 tests), focused tests, native Bun execution, and git diff --check. No remote resource was mutated.
<!-- SECTION:FINAL_SUMMARY:END -->
