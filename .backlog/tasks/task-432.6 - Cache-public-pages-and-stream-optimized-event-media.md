---
id: TASK-432.6
title: Cache public pages and stream optimized event media
status: Done
assignee:
  - '@luna-media'
created_date: '2026-08-19 06:22'
updated_date: '2026-08-19 19:29'
labels: []
dependencies:
  - TASK-432.1
references:
  - 'server/api/public/events/[slug]/images/background.get.ts'
  - 'server/api/public/events/[slug]/images/banner.get.ts'
  - server/domains/events/images.ts
parent_task_id: TASK-432
priority: high
type: enhancement
ordinal: 133000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make public event delivery and event imagery use Cloudflare-native cache and transformation behavior instead of uncached Nuxt rendering and buffered original images.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Published public event pages and public event JSON have explicit cache keys, freshness, and mutation-driven invalidation semantics
- [x] #2 Versioned public event image responses are cacheable and streamed without full arrayBuffer buffering
- [x] #3 Page backgrounds request bounded responsive Cloudflare Images variants with modern negotiated formats
- [x] #4 Private and mutable media keep appropriate authorization and cache isolation
- [x] #5 Tests cover headers, streaming behavior, invalidation hooks, hidden-event behavior, and local fallback behavior
- [x] #6 Workers Cache is explicitly enabled in local and generated deployment configuration and transformed-image cache hits are covered
- [x] #7 Public media routes require the current monotonic media revision and never return raw originals for missing, invalid, or stale revisions
- [ ] #8 Hide, image replacement, image removal, and event deletion revoke every previously public HTML, JSON, and media cache key or use an equally strict globally revocable cache design
- [x] #9 Public HTML rendering is actor-independent and account-specific actions hydrate only on the client through the shared bootstrap
- [x] #10 Edge and browser cache headers use Cloudflare-supported semantics and do not claim ineffective stale-while-revalidate behavior
- [x] #11 Media URLs use a collision-free monotonic revision, UUID, or content digest rather than event updatedAt wall-clock timestamps
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
1. Update docs/schema-outline.md, docs/tech-stack.md, and docs/api-surface.md with the canonical media-revision, invalidation, and bounded cache semantics before changing runtime code.
2. Add an explicit collision-free event/media revision field with migration, Drizzle schema, fake-D1 migration support, and atomic updates across image upload/removal, hide, replacement, deletion, and relevant public-setting mutations.
3. Make public HTML/JSON/media delivery validate the exact current revision before reading storage; keep originals private and preserve streaming plus named Cloudflare Images variants and negotiated formats.
4. Enable the real Workers Cache configuration contract (cache.enabled) in checked-in and generated Wrangler config, validate it against local Wrangler behavior, and use Cloudflare-supported CDN/browser cache directives with a documented bounded revocation window or checked-in purge mechanism.
5. Add focused unit/integration/BDD coverage for config generation/cache hits, stale revisions, all visibility/media mutations, raw-original isolation, headers, streaming, and actor-independent public delivery without changing account bootstrap internals.
6. Run local scoped and full validation, review the diff for unrelated shared-worktree changes, update TASK-432.6 evidence, and commit only scoped files without push/deploy/remote D1.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Corrective media pass (2026-08-19):

- The managed public-media scope is event background/banner images, the platform default event background, and public event-gallery photo responses. Newly issued managed URLs carry the exact current event or platform media_revision and use streamed bounded Cloudflare Images transforms. Public gallery preview is 720px; variant=original selects the named full-display transform capped at 2400px and never returns the stored R2 original.
- Generated certificate PNGs and winner/published-project profile icons are outside this managed cache scope and now remain private, no-store responses. profileIconUpdatedAt remains a request/version guard, not a managed public cache revision.
- Added objective coverage for generated cache and IMAGES bindings, distinct public photo transforms, stale gallery URLs after visibility and deletion, platform-default replacement/removal, certificate/profile-icon cache isolation, and preserved the BDD upload response mediaRevision plus variant=background transformed-Images assertion.
- Newly issued managed event/platform/gallery responses use public max-age=30, stale-if-error=0 browser and Cloudflare headers. Cache hits can bypass the Worker; Cache API deletion is not global, and no runtime purge secret is used.
- Legacy public photo preview/original URLs from older deployments used public max-age=31536000, immutable. A new Worker cannot revoke a browser or edge hit for those URLs, so the 30-second bound does not apply to them. Operators must perform the one-time Cloudflare URL-prefix purge or retire the legacy namespace described in OPERATOR.md, at minimum /api/public/events/ and /api/public/platform/. AC #8 remains unchecked for this legacy boundary.
- Validation: focused unit 2 files/22 tests passed; focused media integration 3 files/127 tests passed; bun run lint passed; bun run typecheck passed; bun run test:unit passed (130 files/953 tests). Full integration passed 31/32 files and 398/399 tests; local-platform-proxy.test.ts failed only because sandbox Wrangler logging and 127.0.0.1 binding are EPERM. BDD stopped during local Wrangler D1 migration bootstrap for the same sandbox listen restriction. No push, deployment, remote D1/test/prod access, or server/database/client.ts change.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Corrective TASK-432.6 pass completed locally. Managed event/platform/gallery media now has explicit scope, bounded named photo transforms, current-revision stale URL tests, and objective config/header coverage; certificates and outcome profile icons are private and outside the managed cache contract. Persistent docs and operator guidance state that legacy immutable public photo URLs can remain edge/browser-cacheable for up to one year and require one-time prefix purge or namespace retirement; strict AC #8 is not claimed for them. Focused tests, lint, typecheck, and unit tests pass. Full integration and BDD retain only the documented sandbox Wrangler/127.0.0.1 restriction. No push or remote access.
<!-- SECTION:FINAL_SUMMARY:END -->
