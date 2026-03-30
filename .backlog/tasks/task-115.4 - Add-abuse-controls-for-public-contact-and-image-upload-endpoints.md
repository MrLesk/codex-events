---
id: TASK-115.4
title: Add abuse controls for public contact and image upload endpoints
status: Done
assignee: []
created_date: '2026-03-30 15:59'
updated_date: '2026-03-30 18:10'
labels:
  - security
  - infra
dependencies: []
references:
  - server/api/public/imprint-contact.post.ts
  - server/utils/legal-contact.ts
  - server/api/account/profile-icon.post.ts
  - 'server/api/hackathons/[hackathonId]/images/background.post.ts'
  - 'server/api/hackathons/[hackathonId]/images/banner.post.ts'
  - wrangler.jsonc
documentation:
  - docs/security-analysis.md
parent_task_id: TASK-115
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Introduce practical abuse controls for the public imprint-contact endpoint and for authenticated image-upload endpoints. The goal is to reduce spam, email-credit abuse, and burst upload misuse without blocking legitimate operators and participants.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The public imprint-contact endpoint has rate limiting or equivalent abuse controls appropriate for unauthenticated traffic
- [ ] #2 Authenticated profile-icon and hackathon-image uploads have abuse controls appropriate to per-actor upload workflows
- [ ] #3 The chosen controls are represented in repo-managed config or canonical operator documentation
- [ ] #4 Validation or tests cover the implemented behavior where practical, and any unavoidable gaps are documented
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-03-30: manager-authored implementation plan after worker failure. Use two Cloudflare Worker rate-limit bindings in `wrangler.jsonc` (`PUBLIC_CONTACT_RATE_LIMITER` and `AUTHENTICATED_UPLOAD_RATE_LIMITER`), a small shared server helper for binding resolution and 429 handling, route-level keys for public contact by client IP and authenticated uploads by actor/hackathon scope, and local proxy injection so Bun/Wrangler development matches deployed Workers.

2026-03-30: manager-approved implementation plan. This task will add repo-managed Cloudflare Workers `ratelimits` bindings for public contact and authenticated uploads, plus a small shared helper to enforce route-level 429 responses using IP-keyed throttling for unauthenticated contact requests and actor-keyed throttling for authenticated upload routes.

2026-03-30: implemented Cloudflare-backed abuse throttling for public contact and authenticated upload routes. Added `server/utils/rate-limit.ts`, configured `PUBLIC_CONTACT_RATE_LIMITER` and `AUTHENTICATED_UPLOAD_RATE_LIMITER` in `wrangler.jsonc`, guarded the public imprint-contact route by client IP, guarded profile-icon uploads by actor ID, guarded hackathon image uploads by hackathon/user scope, and updated the local Wrangler proxy middleware to inject the new bindings during Bun/Vitest execution.

Validation: `bun x vitest run tests/unit/server/middleware/local-d1-binding.test.ts` passed, `bun run test:integration -- tests/integration/server/api/public-legal-routes.test.ts tests/integration/server/api/actor-platform-routes.test.ts tests/integration/server/api/hackathon-routes.test.ts` passed, `bun run typecheck` passed, and `bun run lint` completed with warnings only. `bun run test:unit` currently fails for an unrelated existing change in `server/utils/hackathon-management.ts` / `tests/unit/server/utils/hackathon-management.test.ts` (`assertRoleJudgePoolInvariant` is not a function).

Residual risk: Cloudflare Worker rate-limit counters are location-local rather than globally precise, so the controls are practical abuse throttles rather than exact global quotas.

2026-03-30: implemented shared Workers rate-limit enforcement in `server/utils/rate-limit.ts`, added repo-managed `ratelimits` bindings in `wrangler.jsonc` for local/default, dev, and production, and applied route-level abuse throttling to the public imprint-contact endpoint plus authenticated profile-icon and hackathon-image upload routes.

The public contact limiter is keyed as `public-contact:${clientIp}` using `cf-connecting-ip` with safe fallback. The authenticated upload limiter is keyed as `authenticated-upload:${actor.platformUser.id}` so profile-icon and hackathon-image uploads share the same per-actor budget. Limit exceed responses now return 429s with `Retry-After`.

Validation: `bun run test:integration -- tests/integration/server/api/public-legal-routes.test.ts` passed, `bun run test:integration -- tests/integration/server/api/actor-platform-routes.test.ts` passed, `bun run test:integration -- tests/integration/server/api/hackathon-routes.test.ts` passed, `bun run typecheck` passed, and `bun run lint` exited cleanly with warnings only. `bun run test:unit` still fails in unrelated existing test `tests/unit/server/utils/hackathon-management.test.ts` because `assertRoleJudgePoolInvariant` is currently missing from that module.

Residual risk: Cloudflare rate-limit counters are location-local practical abuse throttles rather than precise global accounting, and the chosen namespace IDs in `wrangler.jsonc` remain environment-specific operator-managed values.

2026-03-30: implemented Cloudflare Workers abuse throttling with repo-managed `ratelimits` config in `wrangler.jsonc`, a shared `server/utils/rate-limit.ts` helper, route-level 429 enforcement for `/api/public/imprint-contact`, and shared per-actor throttling for authenticated profile-icon and hackathon-image uploads. `Retry-After` is set on rate-limited responses.

Validation: `bun run test:integration -- tests/integration/server/api/public-legal-routes.test.ts tests/integration/server/api/actor-platform-routes.test.ts tests/integration/server/api/hackathon-routes.test.ts` passed, `bun run typecheck` passed, and `bun run lint` passed with warnings only. `bun run test:unit` is currently blocked by an unrelated existing failure in `tests/unit/server/utils/hackathon-management.test.ts` (`assertRoleJudgePoolInvariant is not a function`).

Residual risk: Cloudflare Workers rate limiting remains location-local and permissive by design, so this provides practical abuse throttling rather than exact global accounting.
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
