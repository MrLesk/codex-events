---
id: TASK-303.11
title: Move remaining hackathon business utilities into server domains
status: Done
assignee: []
created_date: '2026-04-29 17:58'
updated_date: '2026-04-29 18:00'
labels:
  - architecture
  - server
  - refactor
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
modified_files:
  - docs/database-query-plan-audit.md
  - docs/security-analysis.md
  - server/domains/hackathons/images.ts
  - server/domains/hackathons/photos.ts
  - server/domains/hackathons/feedback.ts
  - server/domains/credits/index.ts
  - server/domains/prize-redemptions/index.ts
  - server/domains/hackathons/index.ts
  - 'server/api/hackathons/[hackathonId]/actions/announce-winners.post.ts'
  - 'server/api/hackathons/[hackathonId]/admin/credits/index.get.ts'
  - 'server/api/hackathons/[hackathonId]/credits/[creditId].patch.ts'
  - 'server/api/hackathons/[hackathonId]/credits/[creditId]/actions/claim.post.ts'
  - 'server/api/hackathons/[hackathonId]/credits/[creditId]/import.post.ts'
  - 'server/api/hackathons/[hackathonId]/credits/index.get.ts'
  - 'server/api/hackathons/[hackathonId]/credits/index.post.ts'
  - 'server/api/hackathons/[hackathonId]/feedback/index.get.ts'
  - 'server/api/hackathons/[hackathonId]/images/background.delete.ts'
  - 'server/api/hackathons/[hackathonId]/images/background.post.ts'
  - 'server/api/hackathons/[hackathonId]/images/banner.delete.ts'
  - 'server/api/hackathons/[hackathonId]/images/banner.post.ts'
  - 'server/api/hackathons/[hackathonId]/photos/[photoId].delete.ts'
  - 'server/api/hackathons/[hackathonId]/photos/[photoId]/image.get.ts'
  - >-
    server/api/hackathons/[hackathonId]/photos/[photoId]/public-visibility.patch.ts
  - 'server/api/hackathons/[hackathonId]/photos/index.get.ts'
  - 'server/api/hackathons/[hackathonId]/photos/index.post.ts'
  - 'server/api/hackathons/[hackathonId]/prize-redemptions/index.get.ts'
  - 'server/api/hackathons/slug/[slug]/index.get.ts'
  - 'server/api/prize-redemptions/[redemptionId]/actions/redeem.post.ts'
  - server/api/prize-redemptions/me.get.ts
  - 'server/api/public/hackathons/[slug]/feedback.post.ts'
  - 'server/api/public/hackathons/[slug]/images/background.get.ts'
  - 'server/api/public/hackathons/[slug]/images/banner.get.ts'
  - 'server/api/public/hackathons/[slug]/photos/[photoId]/image.get.ts'
  - 'server/api/public/hackathons/[slug]/photos/index.get.ts'
  - tests/unit/server/domains/hackathons/images.test.ts
  - tests/unit/server/domains/hackathons/photos.test.ts
  - tests/unit/server/domains/hackathons/feedback.test.ts
  - tests/unit/server/domains/prize-redemptions/index.test.ts
parent_task_id: TASK-303
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Move remaining hackathon-scoped business modules out of server/utils and into explicit server/domain modules so server/utils is reserved for cross-cutting infrastructure. Cover hackathon media, hackathon feedback, hackathon credits, and prize redemptions without compatibility re-exports.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Hackathon image and photo helpers live under the hackathons server domain and all routes/tests import them from the domain path directly.
- [x] #2 Hackathon feedback helpers live under the hackathons server domain and all routes/tests import them from the domain path directly.
- [x] #3 Hackathon credit helpers live under an explicit server domain path and all routes/tests import them from that domain path directly.
- [x] #4 Prize redemption helpers live under an explicit server domain path and all routes/tests import them from that domain path directly.
- [x] #5 No compatibility re-exports remain in server/utils for moved modules.
- [x] #6 Required validation passes: bun run lint, bun run typecheck, and bun run test:unit.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Moved hackathon image, photo, and feedback helpers from server/utils into server/domains/hackathons submodules. Moved hackathon credit helpers into server/domains/credits and prize redemption helpers into server/domains/prize-redemptions. Updated routes, domain imports, unit tests, and technical docs to reference the canonical domain paths directly with no compatibility re-exports. Product docs are unchanged because the domain concepts already existed; stale technical owner paths were updated. Validation passed: moved-domain focused tests, bun run lint, bun run typecheck, and bun run test:unit.
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
