---
id: TASK-115.6
title: Add baseline browser security headers and scope dev-only config
status: Done
assignee: []
created_date: '2026-03-30 15:59'
updated_date: '2026-03-30 18:10'
labels:
  - security
  - frontend
  - infra
dependencies: []
references:
  - nuxt.config.ts
documentation:
  - docs/security-analysis.md
parent_task_id: TASK-115
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Apply baseline browser security headers across the deployed application and remove or tightly scope development-only configuration that should not bleed into production runtime behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Baseline security headers are applied across the deployed app, including framing protection, `X-Content-Type-Options`, referrer policy, and permissions policy
- [ ] #2 HSTS and any CSP changes are introduced without breaking required Auth0 flows or essential asset loading
- [ ] #3 Development-only config in `nuxt.config.ts` is removed from production paths or explicitly scoped to development
- [ ] #4 Operator or developer documentation is updated when configuration expectations change
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-03-30: implementation plan approved. Baseline app-wide headers will be added via server middleware (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) with HSTS only in production. `nuxt.config.ts` will gate devtools to non-production and remove the hard-coded ngrok `allowedHosts` entry. CSP is explicitly deferred from this task to avoid guessing required Auth0/script/connect sources.

2026-03-30: implementation started. This pass applies baseline browser security headers through an early server middleware, adds HSTS only in production, scopes devtools to non-production, and removes the hard-coded Vite `allowedHosts` entry from canonical config. CSP is intentionally deferred to follow-up work because Auth0/script/connect allowances have not been inventoried.

2026-03-30: implemented baseline app-wide browser security headers in `server/middleware/00.security-headers.ts` with a small exported helper for testability. The middleware applies `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy` on every request, and adds `Strict-Transport-Security` only when `NODE_ENV=production`.

`nuxt.config.ts` now scopes devtools to non-production and removes the hard-coded Vite `allowedHosts` entry entirely. No new env variables or operator/developer setup surface were introduced in this pass, so canonical docs were confirmed unchanged.

Validation: `bun run test:unit -- tests/unit/server/middleware/security-headers.test.ts` passed, `bun run typecheck` passed, and `bun run test:unit` passed. `bun run lint` still fails only in unrelated existing files (`server/middleware/local-d1-binding.ts`, `tests/support/backend/api-route.ts`, `tests/unit/server/routes/auth/account-linking.test.ts`).

Residual risk: CSP remains intentionally deferred because required Auth0/script/connect allowances have not been inventoried yet, and HSTS is keyed only to production environment rather than request protocol.

2026-03-30: implemented app-wide security headers via `server/middleware/00.security-headers.ts`. Baseline headers now include `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy`, with `Strict-Transport-Security` added only when `NODE_ENV=production`. `nuxt.config.ts` now disables devtools in production and removes the hard-coded ngrok `allowedHosts` entry.

Validation: `bun run test:unit -- tests/unit/server/middleware/security-headers.test.ts` passed, `bun run typecheck` passed, and `bun run test:unit` passed. `bun run lint` still fails only in unrelated existing files (`server/middleware/local-d1-binding.ts`, `tests/support/backend/api-route.ts`, `tests/unit/server/routes/auth/account-linking.test.ts`).

Residual risk: CSP is intentionally deferred until required Auth0/script/connect sources are inventoried, and HSTS is keyed to production environment rather than request protocol detection.
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
