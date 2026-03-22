---
id: TASK-1
title: Add Auth0 authentication to the Nuxt application
status: Done
assignee:
  - codex
created_date: '2026-03-22 17:38'
updated_date: '2026-03-22 17:53'
labels:
  - auth
  - nuxt
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/tech-stack.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the starter-template authentication gap with Auth0-backed session authentication in the Nuxt app so platform users can sign in with the canonical identity provider defined in docs. The implementation should follow the Auth0 Nuxt SDK model for server-side sessions and align local environment/configuration with the SDK's expected runtime settings.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The Nuxt app is configured to use Auth0 session authentication through the Auth0 Nuxt SDK with runtime configuration sourced from environment variables expected by the SDK.
- [x] #2 The application UI exposes working sign-in and sign-out entry points and reflects whether a user session is present.
- [x] #3 A protected application surface demonstrates authenticated access control by redirecting unauthenticated visitors into the Auth0 login flow.
- [x] #4 Repository setup guidance for local Auth0 configuration is updated so a developer can supply the required environment variables without relying on obsolete names.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Install and register the `@auth0/auth0-nuxt` module in `package.json` and `nuxt.config.ts`, using the SDK's `runtimeConfig.auth0` shape and built-in auth routes.
2. Protect a new authenticated application surface at `/dashboard` with an inline page route guard plus server middleware so unauthenticated requests are redirected to `/auth/login` with `returnTo` on both client navigation and direct server requests.
3. Update the app shell and landing page to expose sign-in and sign-out entry points, show current session state, and link authenticated users into the protected area.
4. Update repository setup guidance in `README.md` and normalize the Auth0 environment variable examples in `.env.example` to the SDK's canonical `NUXT_AUTH0_*` names.
5. Validate the integration with lint and typecheck before finalizing the task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Discovery: app code is still the Nuxt starter template with no existing auth flow or protected routes.

Discovery: `.env.example` currently uses legacy/public Auth0 variable names that do not match the Auth0 Nuxt SDK runtime config shape.

Reference checked: npm registry shows `@auth0/auth0-nuxt` latest version `1.0.1` and its README documents `NUXT_AUTH0_DOMAIN`, `NUXT_AUTH0_CLIENT_ID`, `NUXT_AUTH0_CLIENT_SECRET`, `NUXT_AUTH0_SESSION_SECRET`, and `NUXT_AUTH0_APP_BASE_URL` runtime overrides.

Implementation: added `@auth0/auth0-nuxt`, registered `runtimeConfig.auth0`, and removed the starter `routeRules['/']` prerender because a prerendered home page would not reflect live session state.

Implementation: created `app/pages/dashboard.vue` and `server/middleware/dashboard-auth.ts` to demonstrate protected access with both page-level and server-side redirects into `/auth/login`.

Implementation: updated `app/app.vue` and `app/pages/index.vue` to expose sign-in and sign-out actions and reflect whether an Auth0 session is present.

Validation: `bun run lint` passed.

Validation: `bun run typecheck` passed after switching the dashboard page from named middleware metadata to an inline page guard that matches Nuxt 4's page meta typing in this repo.

Follow-up discovery: the original implementation still fails at runtime under the Cloudflare worker target. Local `wrangler dev` requests to `/`, `/dashboard`, and `/auth/login` returned 500 because `@auth0/auth0-nuxt` reached `useAuth0()` before `event.context.auth0ClientOptions` was populated.

Follow-up plan: initialize Auth0 request context in repo-owned server middleware ahead of route handling, then rebuild and verify the worker locally with the corrected `NUXT_AUTH0_*` environment keys.

Runtime fix: added `server/middleware/auth0-context.ts` to populate `event.context.auth0ClientOptions` from `useRuntimeConfig(event).auth0` before the SDK's SSR middleware or route handlers call `useAuth0(event)`.

Validation: rebuilt with `NITRO_PRESET=cloudflare_module bun run build` and verified the generated worker locally with `wrangler dev`.

Worker verification: `GET /` returned 200, `GET /dashboard` redirected to `/auth/login?returnTo=%2Fdashboard`, `GET /auth/login` redirected to Auth0 and set a transaction cookie, and `GET /auth/logout` redirected to Auth0 logout.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented Auth0 authentication in the Nuxt app using the official `@auth0/auth0-nuxt` module and the SDK's `runtimeConfig.auth0` environment shape. `nuxt.config.ts` registers the module, provides the canonical Auth0 runtime keys, and removes the starter prerender rule for `/` so session-aware UI is not frozen into static HTML.

Added a protected `/dashboard` page that shows authenticated user profile details from `useUser()`. Direct requests are guarded in `server/middleware/dashboard-auth.ts`, and client-side navigation is guarded with an inline page middleware that redirects unauthenticated users to `/auth/login` with a `returnTo` parameter.

Aligned local and example environment files to the SDK's `NUXT_AUTH0_*` variables and generated a session secret for local development.

Resolved the Cloudflare worker runtime failure by adding `server/middleware/auth0-context.ts`, which initializes request-scoped Auth0 client options before the SDK's SSR middleware and auth handlers call `useAuth0(event)`. After that change, the Cloudflare-targeted build and local worker verification both succeeded.

Validation run:
- `bun run lint`
- `bun run typecheck`
- `NITRO_PRESET=cloudflare_module bun run build`
- `wrangler dev` probe results: `GET /` -> 200, `GET /dashboard` -> 302 to `/auth/login`, `GET /auth/login` -> 302 to Auth0, `GET /auth/logout` -> 302 to Auth0 logout
<!-- SECTION:FINAL_SUMMARY:END -->
