---
id: TASK-115.5
title: Harden image upload validation and image response headers
status: Done
assignee: []
created_date: '2026-03-30 15:59'
updated_date: '2026-03-30 18:10'
labels:
  - security
  - uploads
dependencies: []
references:
  - server/utils/profile-icons.ts
  - server/utils/hackathon-images.ts
  - server/api/account/profile-icon.get.ts
  - 'server/api/public/hackathons/[slug]/images/background.get.ts'
  - 'server/api/public/hackathons/[slug]/images/banner.get.ts'
documentation:
  - docs/security-analysis.md
parent_task_id: TASK-115
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Stop trusting client-declared MIME metadata for uploads and ensure served image responses include defensive content-type headers. This task covers both participant profile icons and hackathon image assets.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Profile-icon and hackathon-image uploads are accepted only when file bytes match a supported image format
- [x] #2 Stored or served image content types are derived from validated file content rather than only from multipart metadata
- [x] #3 Image responses include `X-Content-Type-Options: nosniff`
- [x] #4 Automated tests cover spoofed upload rejection and the expected response headers
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-03-30: started discovery and worker planning for upload content validation hardening and defensive image response headers.

2026-03-30: implementation plan approved. Upload validation will derive supported JPEG/PNG content types from file bytes instead of trusting multipart metadata, shared between profile icons and hackathon images. Image GET routes will add `X-Content-Type-Options: nosniff`, and affected unit/integration/BDD fixtures will be updated to use compatible image bytes.

2026-03-30: implementation plan approved. Upload validators will derive canonical JPEG/PNG content type from file bytes, add `X-Content-Type-Options: nosniff` on served image responses, and keep GET-time handling simple without legacy re-sniffing.

2026-03-30: implemented shared byte-signature detection in `server/utils/image-signatures.ts` and switched profile-icon and hackathon-image upload validators to derive canonical JPEG/PNG content types from bytes instead of multipart MIME. Added `X-Content-Type-Options: nosniff` to profile-icon, public background-image, and public banner-image responses.

Validation: `bun run test:unit -- tests/unit/server/utils/profile-icons.test.ts tests/unit/server/utils/hackathon-images.test.ts` passed, `bun run test:integration -- tests/integration/server/api/actor-platform-routes.test.ts tests/integration/server/api/hackathon-routes.test.ts` passed, `bun run typecheck` passed, and `bun run test:unit` passed. `bun run lint` still fails only in unrelated existing files: `server/middleware/local-d1-binding.ts`, `tests/support/backend/api-route.ts`, and `tests/unit/server/routes/auth/account-linking.test.ts`.

BDD/admin upload fixture was updated to use PNG-signature bytes and assert the `nosniff` response header, but the BDD suite was not run in this task.

2026-03-30: implemented shared PNG/JPEG signature detection in `server/utils/image-signatures.ts`, updated profile-icon and hackathon-image validators to derive content type from bytes, added `X-Content-Type-Options: nosniff` to served image responses, and updated unit/integration/BDD fixtures to use compatible image bytes.

Validation: `bun run test:unit -- tests/unit/server/utils/profile-icons.test.ts tests/unit/server/utils/hackathon-images.test.ts` passed, `bun run test:integration -- tests/integration/server/api/actor-platform-routes.test.ts tests/integration/server/api/hackathon-routes.test.ts` passed, `bun run typecheck` passed, and `bun run test:unit` passed. `bun run lint` still fails only in unrelated existing files (`server/middleware/local-d1-binding.ts`, `tests/support/backend/api-route.ts`, `tests/unit/server/routes/auth/account-linking.test.ts`).

Residual risk: validation is signature-based rather than full image decoding, and existing objects already stored with incorrect metadata are not corrected on GET in this task.
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
