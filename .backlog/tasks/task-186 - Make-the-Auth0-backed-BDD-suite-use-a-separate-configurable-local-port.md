---
id: TASK-186
title: Make the Auth0-backed BDD suite use a separate configurable local port
status: Done
assignee:
  - '@codex'
created_date: '2026-04-04 12:06'
updated_date: '2026-04-04 12:12'
labels: []
dependencies: []
documentation:
  - /Users/alex/projects/codex-hackathons/playwright.config.ts
  - /Users/alex/projects/codex-hackathons/tests/bdd/bootstrap.ts
  - /Users/alex/projects/codex-hackathons/tests/bdd/support/personas.ts
  - /Users/alex/projects/codex-hackathons/DEVELOPMENT.md
  - /Users/alex/projects/codex-hackathons/docs/testing-strategy.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The local Auth0-backed BDD suite currently hard-codes `http://localhost:3000` for Playwright and the temporary Nuxt server it boots during persona/bootstrap setup. That collides with the normal local development server and causes the BDD harness to stop any existing listener on port 3000 before starting its own app instance. The BDD workflow should support a separate canonical local test base URL so contributors can keep their normal dev server running while the browser suite uses an isolated port.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The full Auth0-backed BDD harness reads one canonical local base URL for browser navigation, API test clients, bootstrap login flows, and the Playwright web server instead of hard-coding `http://localhost:3000` in multiple places.
- [x] #2 Running `bun run test:bdd` uses a dedicated BDD local port by default so it no longer targets or stops a normal local dev server on port 3000.
- [x] #3 Contributor-facing docs explain the dedicated BDD local port and any Auth0 callback/logout URL requirements for that local test origin.
- [x] #4 Local validation passes with `bun run lint`, `bun run typecheck`, and `bun run test:unit`, plus a focused verification that the updated BDD harness configuration resolves the new base URL consistently.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Centralize the BDD local base URL in the existing test-support environment layer so Playwright config, bootstrap login flows, and authenticated API clients all consume the same value.
2. Change the default BDD local base URL away from the normal dev origin on `localhost:3000`, and update the Playwright webServer command/url to boot Nuxt on that isolated port instead of hard-coding 3000.
3. Add focused unit coverage for the base-url resolution rules so the new default and any explicit overrides stay consistent.
4. Update contributor-facing docs with the dedicated BDD origin plus the Auth0 callback/logout entries required for that extra local port, then run `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Centralized the Auth0-backed BDD base-url resolution in `tests/bdd/support/personas.ts` with a dedicated `NUXT_AUTH0_BDD_APP_BASE_URL` override and a default local BDD origin of `http://localhost:3100`. The BDD helper no longer falls back to the normal local app origin on port 3000.

Updated `playwright.config.ts` and `tests/bdd/bootstrap.ts` to consume the shared BDD base-url helper and to start the temporary Nuxt server with `NUXT_AUTH0_APP_BASE_URL` set to that same test origin. This keeps browser navigation, API clients, bootstrap login flows, and the Playwright web server aligned on the same dedicated port.

Added unit coverage for the base-url resolution rules in `tests/unit/support/bdd/personas.test.ts`, updated `.env.example`, `DEVELOPMENT.md`, and `docs/testing-strategy.md` with the dedicated BDD origin plus Auth0 callback/logout requirements, and ran `bun run lint`, `bun run typecheck`, `bun run test:unit`, and a focused `bun --eval` import of `playwright.config.ts` confirming `use.baseURL` and `webServer.url` both resolve to `http://localhost:3100`. The full Auth0-backed BDD suite was not rerun in this pass.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Made the Auth0-backed BDD harness use a dedicated local app origin instead of taking over the normal dev server on port 3000. The shared BDD base-url helper in `tests/bdd/support/personas.ts` now resolves a canonical BDD origin, honoring `NUXT_AUTH0_BDD_APP_BASE_URL` when set and otherwise defaulting to `http://localhost:3100`.

Updated Playwright and bootstrap wiring so the browser suite, authenticated API clients, persona-login bootstrap flow, and local Nuxt web server all consume that same BDD base URL. The bootstrap-spawned Nuxt process now receives `NUXT_AUTH0_APP_BASE_URL` set to the resolved BDD origin, so Auth0 callback routing stays aligned with the browser target.

Added unit coverage for the base-url resolution rules and updated contributor docs in `.env.example`, `DEVELOPMENT.md`, and `docs/testing-strategy.md` to document the dedicated BDD port and the extra Auth0 callback/logout URLs required for that local test origin. Validation passed with `bun run lint`, `bun run typecheck`, `bun run test:unit`, and a focused import check showing Playwright now resolves both `use.baseURL` and `webServer.url` to `http://localhost:3100`. The full Auth0-backed BDD suite was not rerun after this port change.
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
