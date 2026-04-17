---
id: TASK-268
title: Fix CI regression after judging scale change
status: Done
assignee:
  - Codex
created_date: '2026-04-17 21:45'
updated_date: '2026-04-17 21:47'
labels:
  - ci
  - judging
  - github-actions
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Investigate the failing GitHub Actions run on origin/main after TASK-267, identify the root cause, apply the minimal fix, and restore CI to green without including unrelated worktree changes.
<!-- SECTION:DESCRIPTION:END -->

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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Inspected the failing `ci` workflow run `24587936949` on `origin/main`. Root cause was a missed integration fixture in `tests/integration/server/api/hackathon-routes.test.ts` that still inserted blind-review criterion scores `6` and `9` after TASK-267 tightened the canonical score range to `1..5`. Remapped that fixture to `4` and `5` to preserve the intended ordering under the new scale.

Validation passed: `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/hackathon-routes.test.ts`.

Validation passed: `bun run lint`.

Validation passed: `bun run typecheck`.

Validation passed: `bun run test:unit`.

Validation passed: `bun run test:integration`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed the CI regression introduced after TASK-267 by updating the remaining hackathon participation integration fixture that still seeded out-of-range blind criterion scores. The fixture now uses valid `1..5` values and preserves the same relative outcome ordering. Local validation now matches the failing GitHub Actions job shape: lint, typecheck, unit tests, and the full integration suite all pass.
<!-- SECTION:FINAL_SUMMARY:END -->
