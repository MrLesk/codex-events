---
id: TASK-68
title: Fix local Auth0 login after shared dev domain split
status: In Progress
assignee:
  - '@codex'
created_date: '2026-03-28 23:46'
updated_date: '2026-03-31 17:03'
labels: []
dependencies: []
references:
  - nuxt.config.ts
  - server/middleware/auth0-context.ts
  - tools/auth0/auth0-bootstrap.ts
  - DEVELOPMENT.md
documentation:
  - docs/README.md
  - docs/tech-stack.md
  - docs/testing-strategy.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Local development login currently fails with a 500 from `/auth/login` because the local `.env` still points `NUXT_AUTH0_DOMAIN` at `dev.codex-hackathons.com`, which is now the app hostname rather than the Auth0 issuer host. OIDC discovery against `https://dev.codex-hackathons.com/.well-known/openid-configuration` returns 404, while `https://auth.dev.codex-hackathons.com/.well-known/openid-configuration` returns 200. The fix must restore local login without regressing the shared Cloudflare dev deployment at `https://dev.codex-hackathons.com`, and it must keep using the existing Auth0 tenant rather than introducing a second tenant.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Local login works again with `NUXT_AUTH0_APP_BASE_URL=http://localhost:3000` while the shared dev deployment continues using `https://dev.codex-hackathons.com` and `https://auth.dev.codex-hackathons.com`
- [ ] #2 Runtime Auth0 configuration no longer silently points local OIDC discovery at the application hostname when fallback Auth0 tenant or custom-domain configuration is already available
- [x] #3 Auth0 bootstrap or developer docs no longer imply that the runtime login domain and the application hostname are interchangeable
- [x] #4 Unit coverage exercises the local-domain resolution or guard behavior for this regression
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Normalize request-scoped Auth0 runtime config in server/middleware/auth0-context.ts before the SDK instantiates its server client.
2. Derive sessionConfiguration.cookie.secure from auth0.appBaseUrl so local http://localhost development uses a non-secure session cookie while HTTPS environments keep secure cookies.
3. Add focused unit coverage for the middleware normalization behavior, including both localhost HTTP and HTTPS cases.
4. Update DEVELOPMENT.md to clarify the local Auth0 runtime-domain setup and the Safari-sensitive localhost session-cookie behavior.
5. Run bun run lint, bun run typecheck, and bun run test:unit before handoff.

6. Add narrow temporary server-side auth diagnostics around /auth/callback, /account*, and /api/session to log request cookie names, Auth0 session presence, and any response Set-Cookie emitted during the callback flow.

7. Re-run lint, typecheck, and unit tests after adding diagnostics so the temporary instrumentation is safe to use locally.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Patched server/middleware/auth0-context.ts to clone request-scoped Auth0 client options and derive sessionConfiguration.cookie.secure from auth0.appBaseUrl only when runtime config does not already set it.

Added tests/unit/server/middleware/auth0-context.test.ts to cover localhost HTTP, HTTPS, explicit secure overrides, and one-time per-request injection.

Updated DEVELOPMENT.md to state that NUXT_AUTH0_DOMAIN must point to the Auth0 issuer host rather than the app host and to document the localhost Safari session-cookie behavior.

Validation: bun run lint, bun run typecheck, and bun run test:unit all completed successfully. Lint still reports the existing repository vue/no-v-html warnings in page components outside this task.

Remaining scope on TASK-68: live local-browser confirmation plus the broader runtime-domain resolution behavior described in acceptance criteria 1 and 2.

Confirmed Safari local login works after normalizing pre-injected request-scoped Auth0 client options so localhost uses a non-secure Auth0 session cookie.

Temporary AUTH0_DEBUG_LOCAL instrumentation was added for diagnosis, confirmed the fix, and then removed.

Post-cleanup validation: bun run lint, bun run typecheck, and bun run test:unit all completed successfully. Lint still reports the existing repository vue/no-v-html warnings in page components outside this task.
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
