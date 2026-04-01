---
id: TASK-151
title: >-
  Fix account workspace draft hackathon loading and add a local Luma sync
  fixture
status: Done
assignee:
  - codex
created_date: '2026-04-01 21:44'
updated_date: '2026-04-01 21:50'
labels: []
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The account-scoped hackathon workspace currently throws a 404 for draft hackathons that are visible to admins or other internal actors because the page loads the public hackathon detail endpoints before consulting internal account access data. This work should make the authenticated account workspace load draft hackathons through the internal visibility model instead of requiring public visibility. In the same change, add a deterministic local fixture hackathon that points at the Luma test event URL `https://luma.com/a4i7qtbo` so the flow can be exercised locally with seeded data.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The account workspace at `/account/hackathons/:slug` loads draft hackathons that are visible through authenticated account access without depending on public hackathon detail endpoints.
- [x] #2 Public-only hackathon detail routes remain public-safe and draft hackathons still stay hidden from the public surface.
- [x] #3 The local seeded fixture dataset includes a hackathon configured with `lumaEventUrl = https://luma.com/a4i7qtbo` and `requireLumaEmail = true`.
- [x] #4 Automated tests cover the draft workspace loading path and the local fixture seed change.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Load the account workspace hackathon detail through `/api/hackathons/slug/:slug`, which already applies the internal visibility rules needed for draft access.
2. Load the account workspace criteria and prizes through the authenticated `/api/hackathons/:hackathonId/...` endpoints so the page no longer depends on the public hackathon surface.
3. Update the canonical local draft fixture in `tests/bdd/support/platform-fixtures.ts` to require Luma email and point at `https://luma.com/a4i7qtbo`.
4. Add regression coverage for the internal draft route path and the fixture SQL output.
5. Validate with lint, typecheck, unit tests, targeted integration coverage, and update the actual local D1 row to match the seeded draft fixture.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Switched the account workspace page to authenticated hackathon detail, criteria, and prize endpoints so draft access no longer depends on the public API surface.

Updated the local draft fixture to require Luma email, point at https://luma.com/a4i7qtbo, and corrected its missing country value in the seed tuple.

Added regression coverage for internal draft workspace endpoints versus public draft endpoints, plus fixture SQL assertions for the seeded Luma event URL.

Validated with bun run lint, bun run typecheck, bun run test:unit, and bun run test:integration -- tests/integration/server/api/hackathon-routes.test.ts.

Applied the same draft Luma test hackathon directly into the current local D1 state because that database did not already contain the seeded draft fixture row.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated the authenticated account hackathon workspace so it now loads hackathon detail, evaluation criteria, and prizes through the internal `/api/hackathons/...` routes instead of booting from the public hackathon API. That removes the draft-only 404 for admins and other internal actors while keeping the public draft routes hidden. Added an integration regression that proves the internal draft endpoints resolve for an authorized actor and the public draft endpoints still return 404.

Updated the canonical local draft fixture in `tests/bdd/support/platform-fixtures.ts` to require Luma email and point at `https://luma.com/a4i7qtbo`, and tightened the fixture SQL unit test to assert the seeded Luma config. While touching that row, corrected the missing draft-country value in the existing tuple so the seed data stays aligned with the schema.

Validation: `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bun run test:integration -- tests/integration/server/api/hackathon-routes.test.ts` all passed. I also inserted the same `draft-managed-hackathon` row into the current local D1 database because the live local state did not already include the seeded fixture.

Risk/follow-up: the local database row was inserted directly into the current `.wrangler/state` database, so if the local state is later reset from fixtures it will be recreated from the updated fixture SQL rather than needing another manual insert.
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
