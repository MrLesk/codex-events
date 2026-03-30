---
id: TASK-125
title: Fix GitHub Actions CI SQLite test harness regression on Linux
status: Done
assignee:
  - '@codex'
created_date: '2026-03-30 20:27'
updated_date: '2026-03-30 20:38'
labels: []
dependencies: []
references:
  - 'https://github.com/MrLesk/codex-hackathons/actions/runs/23765929434'
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Restore the GitHub Actions backend-checks workflow after TASK-123 introduced a test-only fake D1 harness dependency on node:sqlite that fails under Bun 1.3.11 on Linux. Keep the fix confined to test support so the production D1 path remains unchanged.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The fake D1 test harness no longer depends on node:sqlite in code paths exercised by bun run test:unit
- [x] #2 bun run test:unit passes locally with the updated harness
- [x] #3 bun run test:integration still passes with the updated harness
- [x] #4 The fix does not modify production D1 runtime files or introduce production fallback behavior
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Root cause: TASK-123 replaced the fake D1 Miniflare harness with a node:sqlite-backed shim. GitHub Actions runs vitest in a Linux environment where neither node:sqlite nor bun:sqlite is available inside the worker module graph, so unit tests failed while importing the shared fake D1 harness from account-linking route tests. Final fix: replace host-runtime SQLite dependencies in the fake D1 harness with a sql.js-backed in-memory database and preserve the existing D1-shaped wrapper API for tests. Production D1 files remain untouched.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
GitHub Actions run 23765929434 failed in backend-checks > Unit tests because tests/support/backend/fake-d1.ts depended on host-provided SQLite modules that are unavailable in the Linux CI Vitest worker. The final fix replaces the fake D1 backend with sql.js, an in-memory SQLite implementation loaded from a regular package, so the shared test harness no longer depends on node:sqlite or bun:sqlite. The D1-shaped wrapper API remains intact, and the change stays confined to tests/support/backend/fake-d1.ts plus the test-only dependencies added to package.json and bun.lock. server/database/client.ts and server/middleware/local-d1-binding.ts were not modified. Validation passed: bun run lint (existing vue/no-v-html warnings only), bun run typecheck, bun run test:unit, and bun run test:integration. Residual note: the previous node:sqlite experimental warnings no longer apply after the sql.js switch.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [x] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
