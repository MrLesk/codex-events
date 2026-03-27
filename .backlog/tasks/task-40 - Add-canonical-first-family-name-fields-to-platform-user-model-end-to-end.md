---
id: TASK-40
title: Add canonical first/family name fields to platform user model end-to-end
status: Done
assignee: []
created_date: '2026-03-27 18:28'
updated_date: '2026-03-27 18:37'
labels: []
dependencies: []
documentation:
  - /Users/alex/projects/codex-hackathons/docs/domain-model.md
  - /Users/alex/projects/codex-hackathons/docs/schema-outline.md
  - /Users/alex/projects/codex-hackathons/docs/api-surface.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Introduce canonical first and family name fields on platform users and propagate the change through schema, server contracts, account/session APIs, client forms, and canonical docs. Registration and account settings should read/write these canonical fields directly while preserving display-name behavior for existing participant/admin surfaces.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 User schema includes canonical first and family name fields with migration/backfill for existing rows
- [x] #2 Account profile update contract accepts canonical first and family name fields and persists them
- [x] #3 Session actor payload exposes canonical first and family name fields for platform users
- [x] #4 Registration and account settings forms prefill and submit canonical first and family name fields
- [x] #5 Existing display-name usage in participant/admin views remains functional after the model update
- [x] #6 Canonical docs are updated to reflect first/family name fields in the current product model
- [x] #7 Relevant unit/integration tests are updated for the new account/session contract and pass
- [x] #8 Required local validation commands pass (at least unit tests and typecheck)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1) Add canonical first/family name columns to the user schema and migration backfill from existing display_name values.
2) Update account-management server contracts and session actor payload to read/write canonical names while keeping display_name derived for presentation.
3) Propagate contract updates through registration and account-settings forms plus frontend actor/profile types.
4) Update canonical docs and automated tests, then validate with typecheck, unit tests, and targeted integration tests.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added migration `drizzle/0012_user_first_family_name.sql` introducing `users.first_name` and `users.family_name` with backfill from `display_name`.

Updated `server/database/schema.ts` and account/session server utilities so canonical names are persisted and returned, while `displayName` is derived from canonical fields during profile updates.

Changed `PATCH /api/account` contract from `displayName` input to required `firstName` + `familyName` input.

Updated account settings and registration flows to prefill and submit canonical names directly; both now patch account profile with `{ firstName, familyName, ... }`.

Added canonical-name fields to frontend session/profile types and updated affected unit/integration tests.

Updated canonical docs (`domain-model`, `schema-outline`, `api-surface`) to reflect first/family name model.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented TASK-40 by introducing canonical first/family user names across database, API contracts, frontend forms, and docs.

What changed:
- Added migration `drizzle/0012_user_first_family_name.sql` to add `users.first_name` and `users.family_name` as non-null text fields with defaults and backfill from existing `display_name`.
- Updated `server/database/schema.ts` user table with canonical `firstName` and `familyName` columns.
- Updated `server/utils/account-management.ts`:
  - profile update schema now requires `firstName` and `familyName` (instead of `displayName` input)
  - profile patch derives/stores `displayName` from canonical names
  - serialization includes canonical names
  - account registration and deleted-user patch populate canonical names
- Updated `server/api/session.get.ts` to expose `firstName` and `familyName` in `platformUser` actor payload.
- Updated frontend session/profile types to include canonical names.
- Updated account settings and registration pages/forms to prefill and submit canonical names directly.
- Updated relevant unit/integration tests for schema columns, account update contract, and actor/session responses.
- Updated canonical docs:
  - `docs/domain-model.md`
  - `docs/schema-outline.md`
  - `docs/api-surface.md`

Validation run:
- `bun run typecheck` passed
- `bun run test:unit` passed
- `bun x vitest run --config vitest.integration.config.ts tests/integration/server/api/actor-platform-routes.test.ts tests/integration/server/database/migration.test.ts` passed

Notes:
- Existing `displayName` behavior is preserved for participant/admin surfaces, but it is now derived from canonical first/family names in account update flows.
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
