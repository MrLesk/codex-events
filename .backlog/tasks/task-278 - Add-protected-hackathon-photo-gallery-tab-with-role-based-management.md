---
id: TASK-278
title: Add protected hackathon photo gallery tab with role-based management
status: Done
assignee:
  - codex
created_date: '2026-04-19 12:10'
updated_date: '2026-04-19 16:39'
labels: []
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a Photos tab to the account-scoped hackathon workspace. Approved participants can view the gallery read-only. Hackathon admins, staff, and judges can view the gallery and manage the photo set by uploading and deleting gallery images. The gallery should use a polished grid presentation with a modern lightbox experience and should keep source images protected behind workspace authorization rather than exposing public URLs. Thumbnail/previews should be derived at request time rather than stored as separate uploaded files.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The account hackathon workspace includes a Photos tab for approved participants, judges, staff, and admins, and hides the tab from actors outside that access set.
- [x] #2 Approved participants can browse the gallery and open photos in a lightbox, but cannot upload or delete photos.
- [x] #3 Hackathon admins, staff, and judges can upload one or more gallery photos and delete existing gallery photos from the Photos tab.
- [x] #4 Photo image endpoints enforce the same read and manage permissions as the tab, so original images are not publicly accessible outside the authorized audience.
- [x] #5 The gallery presents responsive preview images and a modern lightbox experience while preserving protected access to the originals.
- [x] #6 The feature is covered by unit and integration tests for tab access, permissions, and photo CRUD/read behavior.
- [x] #7 Canonical product documentation is updated for the photo gallery access model and operational behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend canonical product docs and tab metadata for a new Photos workspace tab with read access limited to approved participants plus explicit hackathon roles, and management access limited to hackathon admins, staff, and judges.
2. Add backend storage and contracts for hackathon gallery photos: schema + migration for photo metadata, R2 object key helpers, list/upload/delete routes, protected image delivery routes, and authorization helpers distinct from the broader workspace-access check.
3. Bind Cloudflare Images in Wrangler and implement protected preview/original image responses that can derive thumbnail variants from R2 bytes while keeping originals non-public.
4. Build a new account hackathon Photos panel using the existing App/shadcn surface, a responsive grid, upload/delete controls gated by manage rights, and a PhotoSwipe-based lightbox for browsing.
5. Add/update unit and integration tests for tab access, authorization rules, photo CRUD/image reads, and any new utility behavior; then run lint, typecheck, and unit tests as required by repo policy.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Discovery confirmed this is an L2 cross-layer feature touching docs, tabs, auth, schema, API routes, Cloudflare bindings, and UI.

Read access decision from user: approved participants plus judges, staff, and admins. Manage access decision from user: judges, staff, and admins can upload/delete. Preview direction from user: derive preview images via Cloudflare transformations rather than storing separate uploaded thumbnails.

Implemented protected hackathon gallery storage and delivery with a new hackathon_photos table, R2-backed originals, and Cloudflare IMAGES-derived preview responses. Added explicit photo read/manage auth helpers so approved participants are read-only while judges, staff, hackathon admins, and platform admins can upload and delete.

Added the Photos workspace tab and panel using PhotoSwipe for the lightbox, responsive preview tiles, and manage controls gated by page-level role booleans. Updated canonical docs plus operator/developer docs for the IMAGES binding and generated the third-party notices asset for the new runtime dependency.

Validation: bun run notices:generate, bun run lint, bun run typecheck, bun run test:unit, bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/hackathon-routes.test.ts. Residual risk: protected image requests still traverse Worker auth on each fetch, so large gallery traffic is bounded more by Worker request volume than by CDN egress.

No additional practical test gaps remain for this scope beyond the normal absence of end-to-end browser coverage in this change set; unit, targeted integration, and required repo validations all passed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a protected Photos tab to the account hackathon workspace with role-aware access and Cloudflare-backed image delivery. The implementation adds a canonical `hackathon_photos` table plus migration, protected list/upload/delete/image routes, and explicit photo authorization helpers so approved participants can read the gallery while judges, staff, hackathon admins, and platform admins can also manage it.

On the frontend, the workspace now exposes a responsive photo grid with PhotoSwipe lightbox browsing, multi-file uploads, and delete controls gated by manage permissions. Preview images are generated on demand through the Worker `IMAGES` binding while originals remain protected behind workspace authorization. The tab ordering, SEO metadata, local platform-proxy binding forwarding, Wrangler config, and operator/developer docs were updated to reflect the new gallery behavior and runtime requirements.

Tests and validation:
- `bun run notices:generate`
- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`
- `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/hackathon-routes.test.ts`

Risk/follow-up: because photo reads remain protected, each image fetch still hits Worker auth before CDN caching, so future very large galleries may need a separate signed-asset strategy if request volume becomes meaningful.
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
