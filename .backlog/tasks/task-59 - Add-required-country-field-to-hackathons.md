---
id: TASK-59
title: Add required country field to hackathons
status: Done
assignee:
  - codex
created_date: '2026-03-28 14:52'
updated_date: '2026-03-28 15:01'
labels: []
dependencies: []
references:
  - server/database/schema.ts
  - server/utils/hackathon-management.ts
  - app/utils/admin-workspace.ts
  - app/composables/useHackathonPresentation.ts
  - app/components/admin/HackathonConfigForm.vue
documentation:
  - docs/README.md
  - docs/domain-model.md
  - docs/schema-outline.md
  - docs/api-surface.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a canonical required `country` field to the Hackathon model and propagate it through the documented product spec, persistence schema, API contracts, admin configuration surfaces, user-facing location displays, fixtures, and automated tests. The change should keep the location model simple and explicit: hackathons have city, country, and address.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Canonical docs define hackathons as having a required country field alongside city and address
- [x] #2 Hackathon persistence and API contracts support a required country field on create update and read flows
- [x] #3 Admin hackathon create and edit surfaces capture and persist country
- [x] #4 User-facing hackathon location displays include country where the current UI shows location context
- [x] #5 Fixtures and automated tests are updated for the required country field and local validation passes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update canonical docs so Hackathon has required city, country, and address fields.
2. Add `country` to the hackathons schema, generate a migration, and propagate the field through create/update validation and serialization helpers.
3. Extend admin workspace types, form schemas, and admin create/edit UI so country is captured and sent to the backend.
4. Update public and account-facing location displays to include country anywhere current location context is shown.
5. Update fixture builders and affected unit/integration tests, then run local validation with at minimum `bun run test:unit` and targeted tests for schema/API changes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented required `country` field end-to-end across canonical docs, schema, migration, serializers, admin forms, public/account displays, fixtures, and tests.

Added shared frontend location formatter usage so existing city-only location surfaces now render `city, country` consistently.

Validation: targeted schema/migration/formatter tests passed; `bun run test:unit` passed; `bun run typecheck` still fails in pre-existing application review routes unrelated to this change; direct Bun execution of `tests/integration/server/api/hackathon-routes.test.ts` fails in the shared test harness because `vi.stubGlobal` is undefined in that mode.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a required `country` field to the canonical Hackathon model and propagated it through docs, Drizzle schema, a new additive migration, backend create/read serialization, admin form state, and location displays. Public and account-facing surfaces that previously rendered city-only locations now use a shared `city, country` formatter, while the admin create/edit flows now capture and submit country alongside city and address. Updated fixture SQL, test factories, schema assertions, and contract expectations to include country.

Validation run:
- `bun test tests/unit/server/database/schema.test.ts tests/unit/app/composables/useHackathonPresentation.test.ts tests/integration/server/database/migration.test.ts`
- `bun run test:unit`
- `bun run typecheck` (fails only in pre-existing unrelated application review route errors)

Known gaps:
- Direct Bun execution of `tests/integration/server/api/hackathon-routes.test.ts` fails in the existing shared test harness because `vi.stubGlobal` / `vi.unstubAllGlobals` are unavailable in that invocation mode, so that file was not usable as a targeted signal for this change.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [ ] #3 Relevant validation commands pass
- [x] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
