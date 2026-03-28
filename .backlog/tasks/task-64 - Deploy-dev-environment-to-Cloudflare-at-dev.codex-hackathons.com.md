---
id: TASK-64
title: Deploy dev environment to Cloudflare at dev.codex-hackathons.com
status: Done
assignee:
  - '@codex'
created_date: '2026-03-28 17:08'
updated_date: '2026-03-28 22:55'
labels: []
dependencies: []
references:
  - wrangler.jsonc
  - nuxt.config.ts
  - tools/auth0/auth0-bootstrap.ts
  - README.md
  - DEVELOPMENT.md
documentation:
  - docs/README.md
  - docs/domain-model.md
  - docs/tech-stack.md
  - docs/testing-strategy.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Deploy the Codex Hackathons dev environment to Cloudflare and make the public dev site reachable at https://dev.codex-hackathons.com using dev-scoped Cloudflare resources. The deployment must use a dev D1 database and dev R2 buckets, wire the Nuxt app for Cloudflare Workers hosting, and align Auth0 application settings with the final public dev URL. Discovery found a hostname conflict: Auth0 currently has a ready custom domain on dev.codex-hackathons.com while the requested website URL is also dev.codex-hackathons.com. The implementation plan and final work must resolve that conflict explicitly rather than assuming both can coexist on the same DNS target.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A Cloudflare-hosted dev deployment exists for the Codex Hackathons app and is reachable at the agreed public dev URL
- [x] #2 The deployment uses dev-scoped Cloudflare bindings for D1 and R2 rather than the current local or shared placeholders
- [x] #3 Required runtime configuration and secrets for Auth0 Resend D1 R2 and queues are configured for the deployed dev environment
- [x] #4 Auth0 application configuration is aligned with the final dev URL and authentication flow works against the chosen Auth0 domain strategy
- [x] #5 Repository deployment configuration and operator docs are updated to reflect the dev deployment workflow and environment assumptions
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add Cloudflare deploy support without breaking local development: keep the current top-level local bindings in wrangler.jsonc, add a named dev environment for the deployed Worker, and add an operator deploy command that builds Nuxt for the Cloudflare module preset and deploys with Wrangler.
2. Fix Cloudflare-target bundle blockers discovered during validation: add the missing Resend peer dependency required by Nitro's Cloudflare bundle and enable the Cloudflare worker compatibility settings needed by the server bundle.
3. Replace the current Auth0 custom domain on dev.codex-hackathons.com with auth.dev.codex-hackathons.com, create the required Cloudflare DNS record for the new Auth0 edge target, and apply the Auth0 bootstrap against https://dev.codex-hackathons.com as the app base URL and https://auth.dev.codex-hackathons.com as the Auth0 domain.
4. Create and bind dev-scoped Cloudflare resources: use the new dev D1 database 53a5509d-097e-4fa5-bcc9-7a9c1cc0040e, the dev R2 buckets dev-codex-hackathons-profile-icons and dev-codex-hackathons-hackathon-images, and the queue dev-codex-hackathons-application-review-email-delivery in the deploy environment.
5. Deploy the Worker first to Cloudflare, apply remote D1 migrations to the dev database, attach the custom domain route for dev.codex-hackathons.com, repoint DNS from the old Auth0 CNAME to the Worker-owned custom domain, then smoke-test the live homepage and auth flow.
6. Update operator docs for the new dev deployment workflow and run required local validation with at minimum bun run test:unit plus targeted build/deploy validation.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Discovery: .env exists and currently sets NUXT_AUTH0_DOMAIN=dev.codex-hackathons.com, AUTH0_TEST_DOMAIN=codex-hackathons-dev.eu.auth0.com, AUTH0_LOGIN_URI=https://dev.codex-hackathons.com/auth/login, and NUXT_AUTH0_APP_BASE_URL=http://localhost:3000.

Discovery: Cloudflare zone codex-hackathons.com exists and has an active DNS CNAME record for dev.codex-hackathons.com pointing to codex-hackathons-dev-cd-esbkpt7xc3p2auu5.edge.tenants.eu.auth0.com.

Discovery: Auth0 custom-domains API reports dev.codex-hackathons.com as the ready primary/default Auth0 custom domain.

Discovery: CLOUDFLARE_MGMT_TOKEN and CLOUDFLARE_API_TOKEN can access zone, D1, and R2 reads, but Workers and Queues endpoints return Authentication error code 10000 even when Wrangler is forced to use CLOUDFLARE_MGMT_TOKEN.

Risk: The requested app hostname and the current Auth0 custom domain hostname are the same, so the DNS target must be resolved before a Worker custom domain can be attached to the app.

Implemented Cloudflare Workers dev deployment in wrangler.jsonc under env.dev while preserving local top-level bindings for Bun and local D1/R2 development.

Created and bound dev Cloudflare resources: D1 database dev-codex-hackathons (53a5509d-097e-4fa5-bcc9-7a9c1cc0040e), R2 buckets dev-codex-hackathons-profile-icons and dev-codex-hackathons-hackathon-images, and queue dev-codex-hackathons-application-review-email-delivery.

Replaced the Auth0 custom domain on dev.codex-hackathons.com with auth.dev.codex-hackathons.com, added the Cloudflare DNS CNAME for Auth0 verification, and aligned the Auth0 app/tenant bootstrap with https://dev.codex-hackathons.com as the app base URL.

Uploaded Worker secrets for Auth0 and Resend to the Cloudflare dev Worker using CLOUDFLARE_MGMT_TOKEN, applied remote D1 migrations, removed the stale dev Auth0 DNS CNAME, and deployed the Worker custom domain route at dev.codex-hackathons.com.

Updated README.md and DEVELOPMENT.md with the shared dev deployment workflow and the split between the app hostname and Auth0 custom domain.

Adjusted tools/auth0/auth0-bootstrap.ts to match current Auth0 custom-domain API behavior by enforcing primary only when needed and no longer treating is_default as an actionable invariant.

Adjusted Vitest config alias resolution so #platform-legal works under unit and integration tests just like the Nuxt and Cloudflare builds.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Deployed the shared dev environment live at https://dev.codex-hackathons.com on Cloudflare Workers using the dev D1, dev R2, and dev queue bindings. Auth0 now uses https://auth.dev.codex-hackathons.com as the custom domain, and the live /auth/login flow redirects correctly to that host. Validation passed for bun run build:cloudflare, bun run db:migrate:dev, live smoke checks on the homepage and login redirect, and bun run test:unit. Follow-up risk: Wrangler still warns that preview URLs are implicitly enabled for the dev Worker because preview_urls is not set in wrangler.jsonc; deployment works, but that setting should be made explicit if the team wants tighter preview behavior.
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
