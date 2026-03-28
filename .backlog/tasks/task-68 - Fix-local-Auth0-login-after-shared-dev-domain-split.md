---
id: TASK-68
title: Fix local Auth0 login after shared dev domain split
status: In Progress
assignee:
  - '@codex'
created_date: '2026-03-28 23:46'
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
- [ ] #1 Local login works again with `NUXT_AUTH0_APP_BASE_URL=http://localhost:3000` while the shared dev deployment continues using `https://dev.codex-hackathons.com` and `https://auth.dev.codex-hackathons.com`
- [ ] #2 Runtime Auth0 configuration no longer silently points local OIDC discovery at the application hostname when fallback Auth0 tenant or custom-domain configuration is already available
- [ ] #3 Auth0 bootstrap or developer docs no longer imply that the runtime login domain and the application hostname are interchangeable
- [ ] #4 Unit coverage exercises the local-domain resolution or guard behavior for this regression
<!-- AC:END -->

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
