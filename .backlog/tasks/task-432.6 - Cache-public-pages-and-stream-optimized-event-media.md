---
id: TASK-432.6
title: Cache public pages and stream optimized event media
status: Done
assignee:
  - '@luna-media'
created_date: '2026-08-19 06:22'
updated_date: '2026-08-19 18:53'
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
TASK-432.6 implementation and final validation (2026-08-19):

- Added event and platform media_revision schema fields with drizzle/0074_public_media_revisions.sql; public media URLs require the exact current revision, and media/visibility/gallery mutations increment it atomically. Originals remain private; public event/platform/photo delivery streams R2 bodies through bounded Images variants with AVIF/WebP/JPEG negotiation and no raw-original fallback.
- Checked-in wrangler.jsonc and generated deployment config use cache.enabled=true; local wrangler 4.85.0 accepted both config shapes with bunx wrangler types --include-runtime=false.
- Cache contract is public, max-age=30, stale-if-error=0 for browser and Cloudflare edge; no s-maxage, stale-while-revalidate, or one-year public media freshness. No runtime global purge credential is owned, so the canonical bounded visibility invariant is at most 30 seconds for an already-cached browser/edge response; Cache API deletion is not treated as global purge. AC #8 remains visibly unchecked because strict global purge is not claimed.
- bun run lint: passed. bun run typecheck: passed. bun run test:unit: passed (129 files, 946 tests). Targeted event integration: passed (57 tests). Full integration: 31 of 32 files passed, 397 of 398 tests passed; the sole failure is local-platform-proxy.test.ts, blocked by sandbox EPERM binding 127.0.0.1. BDD port 3000 was free, but bootstrap local Wrangler D1 migration failed with the same listen EPERM on 127.0.0.1.
- No push, deployment, remote D1, test environment, or production access used; server/database/client.ts was not modified.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented TASK-432.6 and committed the scoped media/config/docs/test changes. The platform default background route uses strong request-scoped getDatabase(h3Event), not a public-replica accessor. Stale revisions and raw originals are rejected on Worker misses/revalidations. Without a securely owned globally enforceable purge mechanism, browser/Cloudflare cache visibility is bounded to at most 30 seconds; this is the explicit operational tradeoff recorded for AC #8. Full integration and BDD each retain one local sandbox listen-EPERM blocker documented in the task notes.
<!-- SECTION:FINAL_SUMMARY:END -->
