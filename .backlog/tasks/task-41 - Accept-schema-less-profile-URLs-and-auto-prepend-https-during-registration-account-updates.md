---
id: TASK-41
title: >-
  Accept schema-less profile URLs and auto-prepend https during
  registration/account updates
status: Done
assignee: []
created_date: '2026-03-27 19:03'
updated_date: '2026-03-27 19:06'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Allow profile URL fields to be entered without scheme (e.g., github.com/user) and persist normalized https URLs. Ensure registration form validation accepts schema-less URLs and account API patch normalizes them consistently.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Registration profile URL fields accept schema-less URLs without client-side validation errors.
- [x] #2 PATCH /api/account accepts schema-less URLs and persists canonical https:// URLs.
- [x] #3 Existing behavior for empty URL fields remains unchanged (stored as null).
- [x] #4 Automated tests cover normalization behavior.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented schema-less URL normalization for participant/account profile URL fields via shared client helper and server schema preprocessing.

Added domain allowlist validation for social profile fields: GitHub (`github.com`), LinkedIn (`linkedin.com`), X (`x.com`/`twitter.com`).

Registration form URL inputs now avoid native `type=url` scheme enforcement and use custom validation so schema-less entries are accepted.

`PATCH /api/account` now normalizes missing schemes to `https://` and rejects unsupported social profile domains.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Enabled schema-less social profile URL entry while preserving data quality:
- Registration/account flows now accept schema-less URLs and normalize them to `https://...`.
- Domain validation now rejects mismatched providers (e.g., `github.cox/...`) for GitHub/LinkedIn/X fields.
- Empty URL behavior remains unchanged (stored as null).

Files updated:
- app/utils/participant-application.ts
- app/components/public/hackathons/HackathonRegistrationPanel.vue
- app/pages/hackathons/[slug]/register.vue
- app/components/account/PlatformAccountProfileForm.vue
- app/components/account/AccountSettingsProfileForm.vue
- server/utils/account-management.ts
- tests/unit/app/utils/participant-application.test.ts
- tests/integration/server/api/actor-platform-routes.test.ts

Validation:
- `bun run typecheck` passed
- `bun run test:unit` passed
- `bun x vitest run --config vitest.integration.config.ts tests/integration/server/api/actor-platform-routes.test.ts` passed

Docs/config impact:
- No canonical docs changes required for this validation/normalization refinement.

Risks/follow-ups:
- Domain allowlists are explicit and currently scoped to the three social profile fields; if product requirements expand accepted hosts, update both client helper and server schema refinement together.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [x] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
