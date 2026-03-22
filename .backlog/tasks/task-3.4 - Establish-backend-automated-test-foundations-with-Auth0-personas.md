---
id: TASK-3.4
title: Establish backend automated test foundations with Auth0 personas
status: Done
assignee:
  - '@codex'
created_date: '2026-03-22 18:55'
updated_date: '2026-03-22 21:16'
labels:
  - backend
  - testing
  - auth0
milestone: m-0
dependencies:
  - TASK-3.1
documentation:
  - docs/testing-strategy.md
  - docs/permissions-matrix.md
  - .env.example
  - DEVELOPMENT.md
parent_task_id: TASK-3
priority: high
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the shared automated validation foundations required for the API-first program. The backend must be testable through unit, integration, and Auth0-backed end-to-end flows that use the documented stable personas and application-side authorization data. For this repository, end-to-end coverage is authored as BDD scenarios with playwright-bdd, and the repository should expose only the BDD test tree rather than a parallel tests/e2e folder model.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The repository has backend-focused unit and integration testing foundations suitable for the documented API surface.
- [x] #2 The documented stable Auth0 personas can be provisioned or reset together with matching platform-side fixture data for end-to-end validation.
- [x] #3 The shared test foundation supports authenticated coverage without fake tokens, bypass headers, or Auth0-role shortcuts.
- [x] #4 The canonical testing docs explicitly state that end-to-end tests in this repository are authored as BDD scenarios with playwright-bdd.
- [x] #5 At least one Auth0-backed BDD smoke scenario proves real persona login, reusable authenticated session state, and the authenticated test foundation in this repository.
- [x] #6 TASK-3.4-owned authenticated coverage and its support code are implemented without a tests/e2e folder or support/e2e namespace remaining in the repository.
- [x] #7 Docs, config, scripts, gitignore rules, and test code no longer refer to a tests/e2e folder path.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Finish the repository migration to a BDD-only authored end-to-end surface by moving bootstrap, setup, session-state, Auth0, and authenticated request helpers under the `tests/bdd` tree and removing the `tests/e2e` folder model and `support/e2e` namespace.
2. Rename the BDD-oriented scripts and update Playwright config, gitignore rules, docs, and imports so no active repository wiring refers to `tests/e2e` paths.
3. Keep TASK-3.5 API-management coverage inactive and outside the active test surface while preserving only foundation-owned authenticated BDD smoke coverage in TASK-3.4.
4. Activate the local SQLite-backed D1 path as the default fixture-reset and runtime path for local TASK-3.4 validation rather than repairing the remote Cloudflare D1 transaction behavior.
5. Run the full validation sequence and finalize the task only if the local Auth0-backed BDD bootstrap and authenticated BDD suite both succeed honestly.

6. Normalize the BDD execution model so `test:bdd` runs the full suite, including authenticated scenarios, while any public-only subset becomes optional. Update scripts, Playwright project selection, and docs to match that default, then rerun the relevant BDD validation commands before re-finalizing TASK-3.4.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Approved plan recorded. TASK-3.4 scope is limited to the backend automated test foundation with Auth0 personas, including real Auth0 bootstrap, reusable session-state support, authenticated test helpers, and an Auth0-backed BDD smoke scenario. Earlier implementation notes and summaries were stale and are superseded by this execution record.

Scope adjusted with user approval: TASK-3.4 now explicitly owns clarifying the canonical testing docs that repository end-to-end coverage is BDD-authored and aligning the authenticated smoke coverage to that rule. Domain API-management flows remain outside TASK-3.4 scope.

Plan adjusted with user approval: TASK-3.4 authenticated smoke must be a playwright-bdd feature plus step definitions, and TASK-3.5 API-management coverage is out of scope for this task.

Implemented the TASK-3.4 scope correction: the authenticated smoke now lives under BDD feature files and step definitions, the canonical testing docs explicitly state the repository uses playwright-bdd for end-to-end coverage, and the TASK-3.5 API-management spec is no longer part of the TASK-3.4 execution surface.

Validation results in this session: `bun run test:unit tests/unit/support/e2e/personas.test.ts` passed, `bun run test:e2e:generate` passed, and `bun run test:e2e` passed for the public BDD suite.

Live Auth0 verification remains blocked locally. `bun run test:e2e:bootstrap` fails before persona reconciliation because `.env` does not define `AUTH0_TEST_CONNECTION_NAME`, which is still required by the stable-persona provisioning environment for this repository.

TASK-3.4 is not finalized because the Auth0-backed BDD smoke cannot be run honestly until `AUTH0_TEST_CONNECTION_NAME` is configured in the local environment.

Confirmed repository alignment after scope correction: the premature non-BDD TASK-3.5 API-management spec is no longer under `tests/e2e`. It currently lives at `tests/pending/api-management.spec.ts.disabled`, outside the active end-to-end surface, so TASK-3.4 no longer leaves non-BDD authored E2E coverage in the repository's active test tree.

Re-verified TASK-3.4 after the reported BDD generator failure. The current step definition in `tests/bdd/steps/authenticated-session.steps.ts` uses a fixture destructuring argument (`async ({ request }, path) =>`) and no further scope change was needed.

Validation rerun in this session: `bun run test:e2e:generate` passed, `bun run test:e2e` passed for the public BDD suite, and `bun run test:e2e:bootstrap` still failed on missing `AUTH0_TEST_CONNECTION_NAME` in local `.env`.

Aligned TASK-3.4 to the revised repository rule that authored end-to-end coverage is BDD-first: clarified docs/testing-strategy.md and DEVELOPMENT.md so BDD scenarios live under tests/bdd and tests/e2e is reserved for Auth0/bootstrap setup code.

Kept the authenticated smoke within TASK-3.4 as BDD coverage by using tests/bdd/features/authenticated/authenticated-session.feature plus tests/bdd/steps/authenticated-session.steps.ts and the existing Auth0/bootstrap/session-state helpers.

Resolved the repository-level standalone-spec conflict by leaving tests/e2e for bootstrap/setup only and relocating the TASK-3.5-scoped tests/e2e/api-management.spec.ts out of active execution to tests/pending/api-management.spec.ts.disabled without implementing or validating those API flows here.

Validation passed locally with bun run test:e2e:generate, bun run test:e2e, bun run lint, bun run typecheck, bun run test:unit, and bun run test:integration.

Live authenticated verification remains blocked locally: bun run test:e2e:bootstrap and bun run test:e2e:auth0 both fail because the local .env does not define AUTH0_TEST_CONNECTION_NAME. AC #5 therefore remains open until the authenticated BDD smoke can execute against a configured Auth0 test tenant.

Scope adjusted with user approval: TASK-3.4 must now fully remove the tests/e2e folder model and support/e2e namespace from the repository, keep only the BDD test tree, scrub tests/e2e path references from docs/project wiring, and finish the live Auth0-backed BDD validation path rather than leaving the task blocked.

User approved the completion strategy: prefer local SQLite-backed D1 for platform fixture reset in TASK-3.4. Direct remote D1 reproduction shows status 400, code 7500, with Cloudflare rejecting SQL transaction wrappers and instructing callers to use transaction APIs instead. This is treated as evidence for choosing the local path rather than widening TASK-3.4 into remote D1 transaction API repair.

User approved using local SQLite-backed D1 as the preferred fixture-reset backend for TASK-3.4, provided the repository documents it clearly and the local database lifecycle is explicit, deterministic, and safe. TASK-3.4 should ensure local SQLite initialization and cleanup behavior are implemented and documented rather than relying on remote D1 for task completion.

Focused discovery confirms the active repository surface is already BDD-only: no tests/e2e directory exists under tests, no support/e2e namespace exists, and repository text search returns no remaining tests/e2e or support/e2e references in docs/config/scripts/test code.

Current live TASK-3.4 blocker is earlier than D1 fixture reset. Local SQLite-backed D1 already defaults in code and is sufficient for fixture reset, but bun run test:bdd:bootstrap currently fails in tests/bdd/support/auth0-management.ts because Auth0 rejects a PATCH that updates password and email_verified simultaneously (400 operation_not_supported). Proceeding with a narrow fix and unit coverage for the Auth0 persona reconciliation path.

Final validation completed in the current repository state: `bun run lint`, `bun run typecheck`, `bun run test:unit`, `bun run test:integration`, and `bun run test:bdd:auth0` all passed. The authenticated BDD run exercised real Auth0 persona reconciliation, local SQLite-backed platform fixture reset, BDD bootstrap, and reusable authenticated session state.

Completed the final TASK-3.4 cleanup by removing the `tests/e2e` folder model and `support/e2e` namespace, migrating bootstrap and support code under `tests/bdd`, renaming the Playwright scripts to `test:bdd:*`, and eliminating tracked repository references to `tests/e2e` or `support/e2e`.

Resolved the live Auth0 blockers in this environment by fixing local `.env` parsing of the platform-admin password, adding the dedicated test connection name, enabling the local SQLite-backed fixture path, configuring the Auth0 application callback/origin URLs for local BDD login, and isolating browser login to a dedicated BDD Auth0 login/callback route that forces the `codex-hackathons-e2e-users` database connection.

Finished TASK-3.4 under the stricter user-approved scope: the repository no longer uses a tests/e2e folder model or a support/e2e namespace, and docs/config/scripts/gitignore/test code were aligned to the BDD-only structure under tests/bdd.

Completed the live Auth0-backed BDD foundation in this environment by fixing local test-tenant prerequisites and harness behavior: AUTH0_TEST_CONNECTION_NAME now points at the dedicated e2e connection, the Auth0 regular web app was updated with local callback/logout/origin URLs, local platform fixture reset uses NUXT_DATABASE_LOCAL_SQLITE_PATH for SQLite-backed D1 preparation, and the BDD bootstrap can start a local Nuxt server on demand before reconciling personas and persisting storage state.

Validation completed successfully with bun run test:unit, bun run test:integration, bun run lint, bun run typecheck, bun run test:bdd, and bun run test:bdd:auth0. The final authenticated command passed end-to-end from a clean state with real Auth0 login, reusable storage state, and the authenticated BDD smoke.

Post-finalization correction: collapsed the duplicate `tests/bdd/support/personas.ts` import in `tests/bdd/bootstrap.ts` to satisfy `import/no-duplicates`. Fresh rerun after the fix: `bun run lint` passed, `bun run typecheck` passed, and `bun run test:bdd:auth0` passed with both the public and authenticated BDD scenarios green.

Completed the live Auth0 repair loop for TASK-3.4. The effective fixes were: keep Auth0 brute-force unblock on /api/v2/user-blocks/{user_id}, add focused unit coverage for the update-and-unblock sequence, increase blocked-banner retry backoff in tests/bdd/support/session-state.ts, and align tests/bdd/bootstrap.ts to spawn the local Nuxt dev server on the same hostname as NUXT_AUTH0_APP_BASE_URL so standalone bootstrap can reach /auth/bdd-login reliably.

Final TASK-3.4 verification in this session: bun run test:bdd:bootstrap passed end-to-end with local SQLite fixture reset and saved Auth0 session-state; bun run test:bdd:auth0 passed the public and authenticated BDD suites; rg -n "tests/e2e|support/e2e" -S . returned no matches; find tests -maxdepth 3 -type d confirmed only the BDD tree remains as the repository E2E surface under tests/.

Final verification for TASK-3.4 completed locally: `bun run lint`, `bun run typecheck`, `bun run test:unit`, `bun run test:integration`, `bun run test:bdd:generate`, `bun run test:bdd`, `bun run test:bdd:bootstrap`, and `bun run test:bdd:auth0` all passed.

The repository no longer contains `tests/e2e` or `support/e2e` paths or references. BDD coverage now lives under `tests/bdd`, bootstrap is self-contained in `tests/bdd/bootstrap.ts`, and authenticated support lives under `tests/bdd/support`.

Live Auth0-backed validation now completes honestly in this environment using the local SQLite-backed D1 fixture-reset path plus the real Auth0 test tenant and the dedicated `/auth/bdd-login` and `/auth/bdd-callback` routes.

User approved a narrow post-completion normalization pass within the existing BDD test foundation: make the default `test:bdd` command include authenticated scenarios, with any public-only execution becoming the optional shortcut rather than the canonical path.

Post-completion normalization finished with user approval: collapsed the BDD command surface so `bun run test:bdd` is the single canonical local test command and runs both signed-out and authenticated scenarios. Removed the extra script variants and Playwright env gating that made authenticated scenarios optional by default.

Extended the authenticated BDD smoke from a single hardcoded platform-admin path to a persona-driven scenario outline that now exercises all four stable Auth0 users through the same authenticated project.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Finished the backend automated test foundation as a BDD-only surface. The repository no longer uses a `tests/e2e` folder or `support/e2e` namespace; authored browser coverage and authenticated support now live under `tests/bdd`, with helper modules under `tests/bdd/support`, a self-contained bootstrap command in `tests/bdd/bootstrap.ts`, and the authenticated smoke scenario in `tests/bdd/features/authenticated/authenticated-session.feature` plus matching step definitions.

The Auth0-backed path was completed honestly in this environment. Stable personas are reconciled through the Auth0 Management API with reduced no-op churn and bounded retry handling, platform fixtures reset against the local SQLite-backed D1 path, session-state artifacts are rebuilt under `tests/bdd/.auth`, and the login flow uses dedicated repository routes at `server/routes/auth/bdd-login.ts` and `server/routes/auth/bdd-callback.ts` to force the test database connection during real browser login.

Project wiring and contributor docs were aligned to the BDD-only model: package scripts now use the `test:bdd:*` surface, Playwright only exposes public and authenticated BDD projects, docs no longer mention `tests/e2e`, and the pending TASK-3.5 API-management file remains outside the active test surface. Validation passed with `bun run lint`, `bun run typecheck`, `bun run test:unit`, `bun run test:integration`, `bun run test:bdd:generate`, `bun run test:bdd`, `bun run test:bdd:bootstrap`, and `bun run test:bdd:auth0`. Residual risk: the authenticated path still depends on the local Auth0 test tenant retaining the configured connection name and app settings used by the BDD auth routes.

Normalized the local BDD execution model after initial completion. The repository now exposes one canonical local command, `bun run test:bdd`, which bootstraps Auth0 personas and local SQLite-backed fixtures, generates the Playwright BDD output, and runs both signed-out and authenticated scenarios in one pass. The older split between default and authenticated-specific commands was removed so normal local testing matches the expected full-suite behavior.

The authenticated BDD smoke now runs as a persona-driven scenario outline instead of a single hardcoded platform-admin case. The default `bun run test:bdd` command exercises the signed-out scenario plus authenticated reuse for `platform_admin`, `hackathon_admin`, `judge`, and `regular_user` in one suite run.
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
