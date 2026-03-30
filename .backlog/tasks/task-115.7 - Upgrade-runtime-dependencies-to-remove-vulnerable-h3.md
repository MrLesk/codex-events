---
id: TASK-115.7
title: Upgrade runtime dependencies to remove vulnerable h3
status: Done
assignee:
  - Codex
created_date: '2026-03-30 15:59'
updated_date: '2026-03-30 18:10'
labels:
  - security
  - dependencies
dependencies: []
references:
  - package.json
  - bun.lock
documentation:
  - docs/security-analysis.md
parent_task_id: TASK-115
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the production runtime dependency graph so the application no longer resolves the vulnerable `h3@1.15.6` version reported during the 2026-03-30 security review.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Production runtime dependencies are updated so the application no longer resolves vulnerable `h3@1.15.6`
- [x] #2 `bun audit` no longer reports the runtime-relevant `h3` advisory
- [x] #3 Lockfile and dependency changes are intentional, reviewable, and documented in the task summary
- [x] #4 `bun run lint`, `bun run typecheck`, and `bun run test:unit` pass after the dependency upgrade
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Remove the unintended direct `h3` dependency drift from `package.json` and the matching root-resolution state in `bun.lock`.
2. Refresh the lockfile under the existing direct dependency versions first so Bun re-resolves `h3` within the published `^1.15.x` ranges used by Nuxt/Nitro/Auth0 and related tooling.
3. Re-run `bun audit` and `bun why h3` to verify that runtime `h3@1.15.6` is gone and document the resulting resolution.
4. Run `bun run lint`, `bun run typecheck`, and `bun run test:unit`, then separate any remaining failures into unrelated baseline issues versus dependency-regression failures.
5. Escalate to the minimal direct dependency bump only if a current-range lockfile refresh still leaves runtime `h3@1.15.6`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-03-30: planning confirmed that the current published `nuxt@4.4.2` / `@nuxt/nitro-server@4.4.2` dependency ranges already allow a patched `h3` release. This task should prefer a targeted lockfile refresh that resolves `h3` to `>=1.15.9` under existing ranges, rather than a speculative direct dependency bump, unless package-manager behavior proves that insufficient.

2026-03-30: Approved implementation plan favors a targeted lockfile refresh under existing direct dependency versions. Direct `h3` addition in the worktree is unintended drift and will be removed as part of this task.

2026-03-30: Added a root package override for `h3: 1.15.10` in `package.json` and refreshed `bun.lock` so the Nuxt/Auth0 runtime graph no longer resolves `h3@1.15.6`. `bun why h3` now reports `h3@1.15.10` for the runtime paths and `bun audit` no longer reports the runtime-relevant h3 advisory.

2026-03-30: Validation after the override: `bun run lint` passed with the existing `vue/no-v-html` warnings only, `bun run typecheck` passed, and `bun run test:unit` still fails in `tests/unit/server/utils/hackathon-management.test.ts` because `server/utils/hackathon-management.ts` no longer exports `assertRoleJudgePoolInvariant`. That failure is pre-existing parallel work outside this task’s files, so TASK-115.7 remains In Progress pending a clean repo baseline.

2026-03-30: Re-ran the full repo validation after isolating the security remediation from parallel work. `bun run lint` passed with the existing six `vue/no-v-html` warnings, `bun run typecheck` passed, and `bun run test:unit` passed.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Canonical docs were updated or confirmed unchanged
- [ ] #2 Code behavior matches canonical docs
- [ ] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [ ] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [ ] #7 Auth and permissions changes follow the documented platform model
- [ ] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
