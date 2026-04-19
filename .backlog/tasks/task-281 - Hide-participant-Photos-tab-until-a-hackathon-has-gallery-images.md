---
id: TASK-281
title: Hide participant Photos tab until a hackathon has gallery images
status: Done
assignee:
  - '@codex'
created_date: '2026-04-19 16:52'
updated_date: '2026-04-19 16:55'
labels: []
dependencies: []
references:
  - app/utils/account-hackathon-tabs.ts
  - 'app/pages/account/hackathons/[slug]/index.vue'
  - 'server/api/hackathons/slug/[slug]/index.get.ts'
documentation:
  - docs/README.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Adjust the account hackathon workspace so approved participants do not see the Photos tab until the hackathon actually has gallery images. Judges, staff, hackathon admins, and platform admins should still see the Photos tab even when the gallery is empty so they can manage uploads. Keep the implementation aligned with the existing workspace-detail preload path rather than loading the whole gallery just to decide tab visibility.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Approved participants do not see the Photos tab when a hackathon has no gallery photos.
- [x] #2 Approved participants see the Photos tab once the hackathon has at least one gallery photo.
- [x] #3 Judges, staff, hackathon admins, and platform admins still see the Photos tab even when the gallery is empty.
- [x] #4 Tab visibility is covered by updated unit or integration tests.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Kept the change on the existing workspace-detail preload path instead of fetching the gallery just to decide tab visibility. The slug detail route now returns `hasPhotos` only for actors who already qualify for restricted hackathon workspace details, which avoids leaking private gallery existence to public or non-approved callers.

Updated tab access so approved participants only get the Photos tab when `hasPhotos` is true, while judges, staff, hackathon admins, and platform admins still always get the tab. Added unit coverage for the tab helper and integration coverage for the slug detail route behavior.

Validation: bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/hackathon-routes.test.ts, bun run lint, bun run typecheck, bun run test:unit. No canonical docs or config docs needed changes because the underlying product access model and runtime setup are unchanged.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Adjusted the Photos tab visibility so approved participants only see it after a hackathon actually has gallery images. The account workspace now reads an authorized `hasPhotos` flag from the existing hackathon detail preload, and the tab access helper only exposes `Photos` to participants when that flag is true. Judges, staff, hackathon admins, and platform admins still always see the tab so they can upload the first images.

Implementation scope stayed narrow: the slug detail route now includes `hasPhotos` only for actors who already qualify for restricted hackathon workspace details, the account workspace page threads that value into tab access, and the tab helper/tests were updated accordingly. This avoids adding an extra gallery fetch and avoids leaking private gallery existence to public or non-approved callers.

Tests and validation:
- `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/hackathon-routes.test.ts`
- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`

Risk/follow-up: the route now performs one extra lightweight photo-existence query for authorized workspace-detail reads. That is small, but if more derived workspace visibility flags accumulate on this route later, it may be worth consolidating them into one dedicated workspace-summary read.
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
