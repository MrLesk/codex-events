---
id: TASK-282
title: Add public-selectable hackathon gallery photos and rename Photos to Gallery
status: Done
assignee: []
created_date: '2026-04-19 17:59'
updated_date: '2026-04-19 18:13'
labels:
  - hackathons
  - gallery
  - public-surface
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/api-surface.md
  - docs/permissions-matrix.md
  - legal/hackathons/codex-vienna-2026-04-18/application-terms.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Allow hackathon gallery managers to mark individual hackathon gallery photos as publicly visible on the public hackathon detail page. Keep the full protected gallery in the account workspace for approved participants and explicit roles, expose only the selected subset on the public hackathon detail page, and rename the actor-facing tab label from Photos to Gallery.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Gallery photo records support an explicit public-visibility setting that managers can update without changing protected-gallery access.
- [x] #2 The account workspace Gallery tab continues to show the protected gallery to approved participants and explicit roles, while managers can toggle whether a photo appears publicly.
- [x] #3 The public hackathon detail page shows a Gallery tab only when the hackathon has at least one publicly visible gallery photo, and that tab renders only the public subset.
- [x] #4 Actor-facing labels and copy use Gallery instead of Photos where this feature appears.
- [x] #5 Automated coverage and canonical docs are updated for the new public-gallery behavior and naming.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend hackathon gallery photo records with explicit public visibility and add protected/public gallery helpers plus routes.
2. Replace the account-only Photos panel with a shared Gallery component used by both the account workspace and the public hackathon detail page.
3. Rename actor-facing Photos tab labels to Gallery and show the public Gallery tab only when at least one gallery photo is public.
4. Update docs and automated coverage, then run lint, typecheck, unit tests, and the gallery-focused integration suite.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented a shared gallery panel with PhotoSwipe lightbox, manager-only public visibility toggles, and separate protected/public data flows while keeping approved participants read-only.

Validated with targeted gallery unit tests, the hackathon-routes integration suite, and the full required lint/typecheck/unit commands. Lint still reports the existing unrelated vue/no-v-html warning in AdminCompetitionPrizeRedemptionsPanel.vue.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added public-selectable hackathon gallery photos by extending `hackathon_photos` with `is_publicly_visible`, exposing manager-only `PATCH /api/hackathons/:hackathonId/photos/:photoId/public-visibility`, and adding public gallery list/image routes under `/api/public/hackathons/:slug/photos`. Replaced the account-only Photos panel with a shared `HackathonGalleryPanel` so the account workspace and public hackathon detail page use the same grid/lightbox presentation while keeping managers able to upload, delete, and toggle public visibility. Renamed the actor-facing tab and SEO copy from Photos to Gallery, updated the account slug payload to return `hasGallery`, documented the new behavior in the canonical docs, and added coverage for the new schema, route helpers, protected/public gallery routes, and tab naming. Validation: `bunx vitest run tests/unit/server/utils/hackathon-photos.test.ts tests/unit/server/database/schema.test.ts tests/unit/app/utils/account-hackathon-tabs.test.ts tests/unit/app/utils/account-hackathon-seo.test.ts`, `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/hackathon-routes.test.ts`, `bun run lint`, `bun run typecheck`, and `bun run test:unit`. Residual note: lint still reports the existing unrelated `vue/no-v-html` warning in `app/components/admin/AdminCompetitionPrizeRedemptionsPanel.vue`.
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
