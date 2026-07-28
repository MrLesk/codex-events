# Local Test Personas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the BDD suite and local load runner authenticate four fixed local personas without Auth0 credentials, browser login, Codex login, or external network requests.

**Architecture:** Keep production Auth0 unchanged. Test tooling writes the existing `codex-events-local-user` cookie directly into Playwright storage-state files, while D1 fixtures map the derived `local-chatgpt|<email>` subject to platform and event roles.

**Tech Stack:** TypeScript, Nuxt, Playwright/Playwright BDD, Vitest, Cloudflare D1/Wrangler, GitHub Actions.

## Global Constraints

- Do not add another runtime auth provider, endpoint, header, token, or compatibility fallback.
- Keep authorization exclusively in D1 fixture rows.
- Force BDD and the local load runner into the existing local-auth path even when the developer has Auth0 values in their shell or `.env`.
- Preserve production and deployed-environment Auth0 behavior.
- Use `BDD_BASE_URL` as the only optional BDD origin override.

---

## Task 1: Define fixed personas and local storage state

**Files:**

- Modify: `tests/unit/support/bdd/personas.test.ts`
- Create: `tests/unit/support/bdd/local-session-state.test.ts`
- Modify: `tests/bdd/support/personas.ts`
- Replace: `tests/bdd/support/session-state.ts` with `tests/bdd/support/local-session-state.ts`

- [x] Update persona tests to require four source-defined emails, display names, nicknames, and `local-chatgpt|<email>` subjects with no password or Auth0 environment dependency.
- [x] Add storage-state tests that read the generated JSON and assert the local cookie name, value, host, path, HTTP-only flag, same-site policy, secure flag, and session expiry.
- [x] Run the focused tests and confirm they fail for the missing behavior.
- [x] Implement the minimal fixed persona definitions, `BDD_BASE_URL` parsing, and direct storage-state writer.
- [x] Run the focused tests and confirm they pass.

## Task 2: Simplify BDD bootstrap and fixtures

**Files:**

- Modify: `tests/bdd/bootstrap.ts`
- Modify: `tests/bdd/support/platform-fixtures.ts`
- Modify: `tests/unit/support/bdd/platform-fixtures.test.ts`
- Delete: `tests/bdd/support/auth0-management.ts`
- Delete: `tests/unit/support/bdd/auth0-management.test.ts`
- Delete: `server/routes/auth/bdd-login.ts`
- Delete: `server/routes/auth/bdd-callback.ts`

- [x] Update fixture tests to expect the fixed local subjects and role assignments.
- [x] Run the fixture tests and confirm they fail against the Auth0-derived fixture model.
- [x] Reduce bootstrap to D1 reset/seed plus direct storage-state generation; remove Nuxt, Chromium, Auth0 management, retry, and password-login work.
- [x] Update fixture types to consume the fixed persona shape and delete obsolete BDD-only Auth0 modules/routes.
- [x] Run the focused persona, storage-state, and fixture tests and confirm they pass.

## Task 3: Force local auth in BDD and update scenarios

**Files:**

- Modify: `playwright.config.ts`
- Modify: `tests/bdd/steps/authenticated-session.steps.ts`
- Modify: `tests/bdd/features/**/*.feature`
- Modify: `package.json` only if the existing script entrypoints require adjustment

- [x] Make Playwright use `BDD_BASE_URL`, ignore `.env`, and clear all four required Auth0 runtime variables when starting Nuxt.
- [x] Rename saved-session scenario language from Auth0 sessions to local sessions without changing the actor behaviors under test.
- [x] Generate the BDD specs and run the authenticated-session feature as the first end-to-end red/green check.
- [x] Run the complete BDD suite with Auth0 and E2E settings absent.

## Task 4: Reuse local personas in the load runner

**Files:**

- Modify: `tools/load-tests/local-1000-participant-event.ts`
- Modify or create focused unit coverage under `tests/unit/tools/load-tests/` if the runner exposes a testable boundary

- [x] Replace Auth0 persona reconciliation and browser login with the shared fixed personas and storage-state writer.
- [x] Start the runner's Nuxt child with `.env` ignored and required Auth0 runtime variables cleared.
- [x] Preserve the existing CLI base URL, D1 seeding, event-admin API/browser probes, and load behavior.
- [x] Run the load-runner smoke mode and verify authenticated requests resolve the event-admin persona.

## Task 5: Remove BDD Auth0 configuration and update canonical guidance

**Files:**

- Modify: `.github/workflows/deploy-test.yml`
- Modify: `.env.example`
- Modify: `DEVELOPMENT.md`
- Modify: `docs/testing-strategy.md`
- Modify: `tools/auth0/auth0-bootstrap.ts`
- Modify: `tests/unit/tools/auth0/auth0-bootstrap.test.ts`

- [x] Remove BDD Auth0/E2E secrets, environment binding, configuration checks, generated session secret, and conditional skip from the scheduled/manual CI job.
- [x] Remove BDD persona credentials, Auth0-specific BDD base URL, and BDD callback URLs from example configuration and Auth0 bootstrap automation.
- [x] Update the bootstrap unit test first, observe the expected failure, then remove the obsolete callback URLs.
- [x] Document the fixed personas, local D1 authorization, zero-secret BDD command, optional `BDD_BASE_URL`, and production Auth0 boundary.

## Task 6: Validate, finalize, and publish

- [x] Search the changed BDD/load/docs/CI surface for obsolete BDD Auth0 configuration, routes, helpers, and wording.
- [x] Run `bun run lint`.
- [x] Run `bun run typecheck`.
- [x] Run `bun run test:unit`.
- [x] Run `bun run test:integration`.
- [x] Run `bun run test:bdd`.
- [x] Run the load-runner smoke check.
- [x] Inspect the final diff for scope and production Auth0 preservation.
- [x] Update `TASK-423` with the completed acceptance criteria and validation results.
- [x] Commit only the implementation files to `main` and push `origin/main`.
