---
id: TASK-421
title: Authenticate local development through Codex app-server
status: Done
assignee:
  - '@codex'
created_date: '2026-07-28 16:08'
updated_date: '2026-07-28 19:28'
labels: []
dependencies: []
modified_files:
  - DEVELOPMENT.md
  - nuxt.config.ts
  - server/auth/local-codex-auth.ts
  - server/middleware/auth0-local-session.ts
  - server/routes/auth/login.ts
  - server/routes/auth/logout.ts
  - tests/support/backend/api-route.ts
  - tests/unit/server/auth/local-codex-auth.test.ts
  - tests/unit/server/middleware/auth0-local-session.test.ts
  - tests/unit/server/routes/auth/local-codex-auth.test.ts
  - tests/unit/server/routes/auth/logout.test.ts
  - tests/unit/tools/local-auth/mode.test.ts
  - tools/local-auth/mode.ts
  - docs/superpowers/specs/2026-07-28-local-codex-auth-design.md
  - docs/superpowers/plans/2026-07-28-local-codex-auth.md
priority: high
type: feature
ordinal: 108000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Contributors can run the platform locally without provisioning Auth0 by using the Codex app-server already installed on maintainer machines. The development-only path must establish a normal platform identity without changing production authentication.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Running `bun run dev` does not require Auth0 configuration when Codex app-server authentication is available
- [x] #2 A maintainer can authenticate locally with their ChatGPT account and receive a normal Codex Events application session
- [x] #3 Production deployments continue to use Auth0 with unchanged authentication behavior
- [x] #4 The application does not persist or expose OpenAI-issued credentials
- [x] #5 Missing Codex installation and failed or cancelled authentication produce clear local-development errors
- [x] #6 Contributor documentation and automated tests cover the supported local authentication flow
<!-- AC:END -->

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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Detect local development with incomplete Auth0 configuration and enable the Codex-only path.
2. Run Codex login from the existing sign-in route, read the ChatGPT email from app-server, and create a local Codex Events session.
3. Feed the local session through the existing authentication seam; clear only that session on sign-out.
4. Add focused tests and contributor documentation, then run the required validation.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented the minimal local authentication path with test-first coverage for mode selection, HTTP-only email session, Auth0 request seam, Codex login/account lookup, and local-only logout. Focused result: 5 test files, 16 tests passing.

Final verification:
- Zero-Auth0 smoke: Nuxt started from /dev/null environment on port 3101, homepage returned 200, and /api/session resolved the local email cookie as a normal authenticated_identity.
- Codex protocol tests verify `codex login`, app-server account/read with refreshToken=false, email-only session data, missing CLI errors, and cancelled sign-in errors. The real app-server account read was also exercised with the maintainer ChatGPT session.
- Production/Auth0: Cloudflare build passed; Auth0-backed BDD passed 51 standard and 2 serialized scenarios.
- Repository validation: lint, typecheck, 790 unit tests, 360 integration tests, Cloudflare build, BDD, and git diff --check passed.

Canonical product and architecture docs remain unchanged because Auth0 remains the production identity provider; this is contributor-only behavior documented in DEVELOPMENT.md. Deliberate local-only limitation: normalized email is the identity key, so changing ChatGPT email creates a new local identity. The cookie is intentionally minimal and must never be enabled outside development. No follow-up work is required.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a zero-configuration local sign-in/sign-out path that uses the installed Codex CLI when Auth0 settings are absent, reads only the ChatGPT email from app-server, and feeds an HTTP-only local session through the existing application identity seam. Auth0 remains unchanged when configured and in production. Verified with zero-Auth0 startup/session smoke testing, 790 unit tests, 360 integration tests, a Cloudflare production build, and all 53 Auth0-backed BDD scenarios.
<!-- SECTION:FINAL_SUMMARY:END -->
