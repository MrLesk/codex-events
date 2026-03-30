---
id: TASK-116
title: Split default local D1 state between dev and BDD workflows
status: Done
assignee:
  - codex
created_date: '2026-03-30 16:14'
updated_date: '2026-03-30 16:19'
labels: []
dependencies: []
documentation:
  - DEVELOPMENT.md
  - docs/testing-strategy.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Stop local BDD/bootstrap flows from sharing the same default D1 persistence root as everyday local development. The canonical local setup should expose two separate local databases by default: one for normal app development and one for destructive/Auth0-backed BDD execution, while keeping the existing remote dev and remote production D1 databases unchanged.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Local app development uses its own default D1 persistence root and no longer shares it implicitly with authenticated BDD/bootstrap flows.
- [x] #2 Authenticated BDD/bootstrap flows use a separate default local D1 persistence root without requiring developers to set a manual override first.
- [x] #3 Developer-facing scripts and docs make the four-target model clear: local dev, local BDD, remote dev, and remote production.
- [x] #4 Validation covers the changed local-D1 workflow wiring and documents any remaining manual verification gap.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Keep the existing `LOCAL_D1_STATE_ROOT` plumbing in runtime/test helpers, but change the entrypoint scripts so local app development defaults that root to `.wrangler/state` while authenticated BDD/bootstrap workflows default it to `.wrangler/state-bdd`.
2. Update the BDD execution path end to end so every process in that flow inherits the BDD root: the `test:bdd` package script, `tests/bdd/bootstrap.ts` child server launch, and the Playwright `webServer` command.
3. Update developer docs and env examples to describe the four database targets explicitly and document the two local override knobs (`LOCAL_DEV_D1_STATE_ROOT` and `LOCAL_BDD_D1_STATE_ROOT`).
4. Validate the changed wiring with focused checks around the local-state guard/script behavior plus the required repository validation commands that are practical for this change.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented separate default local D1 targets at the workflow entrypoints instead of sharing one implicit root. `package.json` now defaults local app dev to `.wrangler/state` and BDD to `.wrangler/state-bdd`, while still allowing `LOCAL_D1_STATE_ROOT` as an explicit one-off override for the current process.

Updated BDD runtime wiring so direct bootstrap and Playwright web-server launches also resolve to the dedicated BDD root when no explicit local root is already set. Added `tests/bdd/support/local-d1-state.ts` plus a focused unit test to lock the precedence rules.

Updated `.env.example`, `DEVELOPMENT.md`, and `docs/testing-strategy.md` to document the four-target model: local dev, local BDD, remote dev, and remote production.

Validation results: `LOCAL_D1_STATE_ROOT=.wrangler/state bun run db:local:guard` passed, `LOCAL_D1_STATE_ROOT=.wrangler/state-bdd bun run db:local:guard` passed, targeted ESLint on changed TS files passed, `bun run typecheck` passed, and `bun run test:unit` passed (57 files, 259 tests).

Ran a throwaway local-dev smoke test with `LOCAL_DEV_D1_STATE_ROOT=.wrangler/state-dev-smoke bun run dev`; migrations applied into `.wrangler/state-dev-smoke/v3/d1` and Nuxt started successfully. The server selected port 3001 because 3000 was already occupied locally, then the smoke run was stopped intentionally.

Repository-wide limitation remains outside this task: `bun run lint` still fails on pre-existing files (`server/middleware/local-d1-binding.ts`, `tests/support/backend/api-route.ts`, and `tests/unit/server/routes/auth/account-linking.test.ts`). Full Auth0-backed `bun run test:bdd` remains blocked by the existing fixture-reset SQL error (`D1_ERROR: all VALUES must have the same number of terms: SQLITE_ERROR`), so authenticated end-to-end verification is still a manual gap until that issue is fixed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Split the default local D1 persistence roots so everyday local development and Auth0-backed BDD no longer share the same database by accident.

What changed:
- Updated `package.json` entrypoints so local app development defaults to `.wrangler/state` and the BDD workflow defaults to `.wrangler/state-bdd`, while preserving `LOCAL_D1_STATE_ROOT` as the explicit per-process override.
- Updated `playwright.config.ts` so the Playwright-managed local web server also uses the dedicated BDD root by default.
- Updated `tests/bdd/bootstrap.ts` to apply the BDD root automatically for direct bootstrap runs, backed by a small resolver in `tests/bdd/support/local-d1-state.ts` and a focused unit test.
- Updated `.env.example`, `DEVELOPMENT.md`, and `docs/testing-strategy.md` to document the four D1 targets clearly: local dev, local BDD, remote dev, and remote production.

Why:
- The previous defaults let BDD reset the same `.wrangler/state` database used by normal local development, which made destructive/Auth0-backed test setup wipe local app data.
- The new defaults give the repository the expected four-database model in practice without changing remote dev or production D1 behavior.

Validation:
- `LOCAL_D1_STATE_ROOT=.wrangler/state bun run db:local:guard`
- `LOCAL_D1_STATE_ROOT=.wrangler/state-bdd bun run db:local:guard`
- `bun x eslint playwright.config.ts tests/bdd/bootstrap.ts tests/bdd/support/local-d1-state.ts tests/unit/support/bdd/local-d1-state.test.ts`
- `bun run typecheck`
- `bun run test:unit`
- `LOCAL_DEV_D1_STATE_ROOT=.wrangler/state-dev-smoke bun run dev` smoke test (verified migrations landed in the throwaway dev root and Nuxt started successfully)

Remaining limitations:
- `bun run lint` still fails in unrelated existing files outside this task.
- Full Auth0-backed `bun run test:bdd` is still blocked by the existing fixture-reset SQL error, so authenticated end-to-end verification remains a follow-up item.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [ ] #3 Relevant validation commands pass
- [x] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [x] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
