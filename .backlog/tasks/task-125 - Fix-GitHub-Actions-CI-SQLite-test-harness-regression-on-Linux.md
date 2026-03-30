---
id: TASK-125
title: Fix GitHub Actions CI SQLite test harness regression on Linux
status: Done
assignee:
  - '@codex'
created_date: '2026-03-30 20:27'
updated_date: '2026-03-30 20:33'
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
Root cause: TASK-123 replaced the fake D1 Miniflare harness with a node:sqlite-backed shim. GitHub Actions runs vitest under a Linux/Bun path where node:sqlite is unavailable, so unit tests failed while importing the shared fake D1 harness from account-linking route tests. Final fix: keep the test-only shim, but load SQLite through createRequire() and normalize the node:sqlite prepare(...) API and bun:sqlite query(...) API behind one local statement adapter. Production D1 files remain untouched.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
GitHub Actions run 23765929434 failed in backend-checks > Unit tests because tests/support/backend/fake-d1.ts hard-imported node:sqlite, which is not available in the Linux/Bun CI runtime. Updated the fake D1 harness to resolve SQLite through createRequire(), use node:sqlite when the active runtime exposes it, fall back to bun:sqlite when Bun is the available backend, and normalize the statement API so the same D1-shaped shim works in both environments. The change is confined to tests/support/backend/fake-d1.ts; server/database/client.ts and server/middleware/local-d1-binding.ts were not modified. Validation passed: bun run lint (existing vue/no-v-html warnings only), bun run typecheck, bun run test:unit, and bun run test:integration. Residual note: node:sqlite still emits experimental warnings during local test runs in environments where that backend is selected.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
