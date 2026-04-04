---
id: TASK-187
title: Teach Auth0 bootstrap about the dedicated BDD callback origin
status: Done
assignee:
  - '@codex'
created_date: '2026-04-04 12:19'
updated_date: '2026-04-04 12:24'
labels: []
dependencies: []
documentation:
  - /Users/alex/projects/codex-hackathons/tools/auth0/auth0-bootstrap.ts
  - >-
    /Users/alex/projects/codex-hackathons/tests/unit/tools/auth0/auth0-bootstrap.test.ts
  - /Users/alex/projects/codex-hackathons/DEVELOPMENT.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The local Auth0-backed BDD suite now uses a dedicated local origin on `http://localhost:3100`, but the Auth0 bootstrap automation still only ensures callback/logout/origin entries for the main local app origin and does not include `/auth/bdd-callback`. The canonical Auth0 bootstrap path should manage the BDD origin and callback route as part of the local app configuration, and the current dev tenant should be updated through that automation so the BDD suite can log in successfully on the dedicated port.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The Auth0 bootstrap automation includes the BDD callback route and the dedicated BDD local origin when ensuring local callback, logout, and origin URLs.
- [x] #2 Auth0 bootstrap tests cover the required callback/logout/origin URL set for the local app plus the BDD callback route.
- [x] #3 Applying the bootstrap automation updates the current Auth0 application so it allows the dedicated BDD local origin and `/auth/bdd-callback`.
- [x] #4 A rerun of `bun run test:bdd` no longer fails with an Auth0 callback mismatch on `http://localhost:3100/auth/bdd-callback`.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend Auth0 bootstrap config resolution to understand the dedicated BDD local origin, defaulting the BDD local app URL to `http://localhost:3100` for localhost development unless an explicit override is provided.
2. Update the client URL bootstrap logic so localhost configuration ensures callback entries for `/auth/callback`, `/auth/link/callback`, and `/auth/bdd-callback` on both the normal local app origin and the BDD local origin, along with matching logout and origin entries.
3. Add unit coverage for the updated bootstrap config and required callback/origin set.
4. Run local validation, apply the bootstrap automation to the current Auth0 tenant, and rerun `bun run test:bdd` to verify the callback mismatch is gone.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Extended the Auth0 bootstrap automation to infer a dedicated localhost BDD origin (`http://localhost:3100`) for local app configs, include `/auth/bdd-callback`, and ensure callback/logout/origin entries for both the normal local app origin and the BDD origin.

Added unit coverage in `tests/unit/tools/auth0/auth0-bootstrap.test.ts`, updated `DEVELOPMENT.md` to document the BDD callback route explicitly, and validated the code changes with `bun run lint`, `bun run typecheck`, and `bun run test:unit`.

Applied `bun tools/auth0/auth0-bootstrap.ts apply` to the current dev tenant. Live Auth0 client settings now include `http://localhost:3100/auth/bdd-callback`, `http://localhost:3100/auth/callback`, `http://localhost:3100/auth/link/callback`, plus logout/origin entries for `http://localhost:3100`.

Reran `bun run test:bdd`. The original Auth0 callback mismatch on `http://localhost:3100/auth/bdd-callback` is resolved, bootstrap succeeded, and the full BDD suite executed on the dedicated port. The suite still has multiple unrelated functional failures, but no port-collision or callback-mismatch failures remain.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated the Auth0 bootstrap automation so local bootstrap now manages the dedicated BDD origin on `http://localhost:3100` in addition to the normal local app origin. The script now ensures `/auth/callback`, `/auth/link/callback`, and `/auth/bdd-callback` for the relevant local origins, along with matching logout and origin entries, and the unit tests cover that required URL set.

Validated the bootstrap code with `bun run lint`, `bun run typecheck`, and `bun run test:unit`, then applied `bun tools/auth0/auth0-bootstrap.ts apply` to the dev tenant. Live Auth0 settings now include the `3100` callback and origin entries, and a full `bun run test:bdd` rerun proved that the original callback mismatch is gone: the suite bootstrapped on `http://localhost:3100`, completed Auth0 persona login, and executed the Playwright projects without touching the user's normal dev server on `3000`.

The full BDD suite still reports multiple unrelated scenario failures after bootstrap, but the dedicated-port and callback-config regression that prompted this work is fixed.
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
