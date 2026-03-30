---
id: TASK-121
title: Restore CI branch-push triggers after tag filter regression
status: Done
assignee: []
created_date: '2026-03-30 17:00'
updated_date: '2026-03-30 17:01'
labels:
  - ci
  - github-actions
dependencies: []
documentation:
  - .github/workflows/ci.yml
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Re-enable GitHub Actions CI for branch pushes after the workflow trigger was narrowed in a way that stopped branch push events from creating CI runs. The workflow should continue to ignore tag-only pushes while preserving branch-based CI and dev deployment behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The ci workflow runs for branch pushes again, including pushes to main.
- [x] #2 Tag pushes do not trigger the ci workflow.
- [x] #3 The workflow trigger configuration is explicit and understandable from the YAML without relying on ambiguous tag-only filtering behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Confirm why recent main pushes stopped creating GitHub Actions ci runs by inspecting workflow history, commit check suites, and repository events with gh.
2. Restore explicit branch-push triggering in `.github/workflows/ci.yml` so branch pushes run ci again without relying on `tags-ignore` alone.
3. Run required local validation and record any existing repo-wide blockers that are outside this task’s scope.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Investigated with gh: recent main pushes created GitHub PushEvent records and Cloudflare check suites, but no GitHub Actions check suite. The workflow trigger regression started after commit `cc4a375` changed `push` to use only `tags-ignore: ['*']`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Restored GitHub Actions branch-push CI triggering after the workflow trigger was narrowed in a way that stopped branch pushes from producing Actions runs.

What changed:
- Updated `.github/workflows/ci.yml` so `ci` now uses an explicit branch filter under `on.push` with `branches: ['**']`.
- This preserves branch-based CI and dev deployment behavior while ensuring tag pushes do not match the workflow.
- The change restores the pre-`cc4a375` branch-push intent without relying on `tags-ignore` alone.

Validation:
- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`

Remaining limitation:
- `bun run lint` still fails in unrelated existing files outside this task (`server/middleware/local-d1-binding.ts`, `tests/support/backend/api-route.ts`, and `tests/unit/server/routes/auth/account-linking.test.ts`).
- `bun run typecheck` passed.
- `bun run test:unit` passed.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [ ] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [ ] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
