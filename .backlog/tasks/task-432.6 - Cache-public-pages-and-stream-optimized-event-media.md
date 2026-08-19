---
id: TASK-432.6
title: Cache public pages and stream optimized event media
status: Done
assignee:
  - '@luna-media'
created_date: '2026-08-19 06:22'
updated_date: '2026-08-19 22:09'
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
- [x] #1 Schema, Drizzle migration, runtime records, generated output schemas, and parity tests use the same canonical media fields and explicit backfill pointers for event images, platform defaults, gallery photos, and profile icons.
- [x] #2 Managed uploads write a collision-free private immutable R2 object before atomically activating its D1 pointer and revision; D1 failure leaves only an unreferenced private object and never overwrites a public revision key.
- [x] #3 Event background, event banner, platform default, gallery photo, and profile icon resources use independent object pointers and numeric revisions; profile icon upload and delete advance the same numeric revision contract with compare-and-swap protection.
- [x] #4 Every mutation that changes public event HTML or JSON visibility, including media, gallery visibility/removal, submission public visibility, completion, hide, and unhide, advances publicContentRevision.
- [x] #5 Versioned public routes require the exact current revision and variant on cache miss or revalidation, validate visibility and the active pointer before R2, and never expose a stored original.
- [x] #6 Managed public responses use exactly public, max-age=30, stale-if-error=0 for browser and Cloudflare freshness; documentation states the strict 30-second visibility SLA without claiming immediate global purge.
- [x] #7 All managed URL producers serialize the exact independent revision and required variant; platform defaults include revision and variant, and gallery preview/full-display variants are documented as 720px and bounded 2400px transforms.
- [x] #8 Managed public media, profile-icon, certificate, and image paths stream responses and do not buffer originals with arrayBuffer; private certificate and outcome profile-icon responses remain no-store.
- [x] #9 Checked-in and generated Cloudflare cache configuration is verified against platform semantics; local Cache API/Miniflare/config coverage is strongest available, with deployed CF-Cache-Status and purge-equivalent verification recorded as the parent final gate.
- [x] #10 Tests cover migration backfill, R2-before-D1 ordering, D1 failure orphans, concurrent replacements, stale and missing revisions, hide/unhide, removal/delete, visibility revision changes, raw-original isolation, headers, streaming, and URL producer/consumer parity.
- [x] #11 The shared actor-independent public SSR and account bootstrap remain intact; only media URL field adaptations overlap account-event consumers, no D1 client internals or unrelated workspace routes are included, and no push, deploy, or remote D1 is used.
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
1. Reconcile the current HEAD and isolate media-owned files and hunks from TASK-432.5 and TASK-433 shared-worktree changes.
2. Align the schema, explicit migration/backfill, immutable pointer lifecycle, independent revisions, public-content revision rotation, and compare-and-swap mutations.
3. Align public/private URL producers and consumers, named image variants, streaming responses, cache headers, and generated output contracts.
4. Run focused and required validation for ordering, concurrency, migration, visibility, streaming, cache semantics, and URL parity, then record the platform-only edge gate.
5. Verify the temporary cached file list contains no sibling paths or talk-proposal symbols and create one scoped local corrective commit without push or deployment.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Corrective architecture checkpoint: managed media uses immutable UUID-keyed private R2 objects with R2-before-D1 activation, independent resource pointers and revisions, and a separate publicContentRevision for public visibility. Pointer clears or rotations precede safe best-effort cleanup; cleanup failure leaves private bytes only.
The canonical public cache contract is exactly public, max-age=30, stale-if-error=0 for both browser and Cloudflare freshness. Cache hits may bypass Worker validation, so the bounded 30-second window is the revocation SLA; local tests cannot prove deployed CF-Cache-Status or global purge semantics.
Validation evidence and the exact corrective commit SHA will be recorded after the scoped temporary-index commit. No push, deployment, or remote database access is allowed.

Focused validation: bun run typecheck passed; 10 focused media unit files passed with 121 tests. The broader operations registry test was not used as a media gate because its isolated clean source tree intentionally excludes concurrent TASK-432.5/TASK-433 untracked page routes; it reports missing sibling routes, not a media contract failure. Full shared-worktree suites were not expanded per the handoff constraint.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
TASK-432.6 corrective media architecture is complete in the scoped local commit created for this task: immutable UUID-keyed R2 pointers with R2-before-D1 activation, independent resource and public-content revisions, explicit migration backfill, exact versioned URL and variant contracts, streamed media responses, and the canonical 30-second cache SLA (public, max-age=30, stale-if-error=0). Focused media validation passed in an isolated clean source tree; shared-worktree route inventory validation remains environment-limited. No push, deployment, or remote D1 access was used. Deployed CF-Cache-Status and purge-equivalent verification remains the parent platform gate.
<!-- SECTION:FINAL_SUMMARY:END -->
