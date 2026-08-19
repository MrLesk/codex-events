---
id: TASK-432.6
title: Cache public pages and stream optimized event media
status: Done
assignee:
  - '@luna-media'
created_date: '2026-08-19 06:22'
updated_date: '2026-08-19 07:07'
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
1. Add server-owned public event media constants and helpers for versioned managed URLs, bounded named variants, Accept negotiation, cache policy, and streaming R2/Cloudflare Images responses.
2. Update public event JSON handlers and the public event page with explicit short freshness/validator behavior, cookie-varied page caching, and versioned managed event/default image URLs while preserving existing public visibility and admin-preview authorization.
3. Replace public event/background/banner original buffering with streamed R2 bodies and fixed Cloudflare Images transforms; keep unversioned or non-public previews private and uncached.
4. Extend focused unit/integration tests for cache headers and validators, streaming bodies, variant bounds/format negotiation, hidden-event isolation, versioned URL/local fallback behavior, and mutation-driven version changes.
5. Run the required local-only validation, inspect the scoped diff, update TASK-432.6 through Backlog CLI, and create one focused local commit without pushing or deploying.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Validation: targeted media/event tests passed (171 tests); bun run test:unit passed (126 files, 934 tests); bun run test:integration passed (30 files, 389 tests); bun run typecheck passed; bun run build passed; git diff --check passed. Scoped ESLint passed; bun run lint also passed before another worker's new app/composables/useApiClient.ts appeared, and the current full lint is blocked only by that file's unused FetchContext. Public BDD scenarios passed; the full BDD command stopped after 32 unrelated authenticated-shell failures involving createUseFetch/auth session navigation, so no authenticated worker files were changed. No remote database, test environment, push, or deploy was used.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented TASK-432.6: public event APIs/pages now expose short cache freshness with validators and cookie-varied page headers; managed event/default media URLs carry mutation versions; versioned public images stream R2 bodies through fixed Cloudflare Images background/banner variants with Accept-negotiated AVIF/WebP/JPEG output; unversioned, draft, hidden, and preview media remain private. Added focused streaming, header, variant, hidden-event, fallback, and mutation-version tests. Verified with local unit/integration/build/type checks; full authenticated BDD remains blocked by parallel worker changes documented in notes.
<!-- SECTION:FINAL_SUMMARY:END -->
