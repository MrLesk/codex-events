---
id: TASK-245
title: Fix CI regression after judging lifecycle change
status: Done
assignee:
  - codex
created_date: '2026-04-17 15:18'
updated_date: '2026-04-17 15:21'
labels:
  - ci
  - tests
dependencies: []
references:
  - .backlog/tasks/task-243 - Delay-submission-locking-until-judging-starts.md
  - .github/workflows/ci.yml
  - tests/integration/server/api/hackathon-routes.test.ts
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update stale integration test expectations after submission locking moved out of judging preparation into the actual judging-start transitions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Integration tests reflect the canonical judging lifecycle after TASK-243.
- [x] #2 The previously failing CI path passes locally.
- [x] #3 Required local validation passes: lint, typecheck, and unit tests.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Root cause: CI was failing on outdated integration expectations introduced by TASK-243, not on the dissolved-team UI change from TASK-244.

Validation: bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/hackathon-routes.test.ts; bun run lint; bun run typecheck; bun run test:unit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated stale hackathon route integration tests after TASK-243 moved submission locking, prize snapshots, and judge assignment creation out of start-judging-preparation and into start-blind-review or pitch-only start-pitch. Verified with the previously failing integration file, then ran lint, typecheck, and unit tests successfully.
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
