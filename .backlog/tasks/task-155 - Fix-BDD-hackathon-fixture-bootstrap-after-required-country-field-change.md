---
id: TASK-155
title: Fix BDD hackathon fixture bootstrap after required country field change
status: Done
assignee:
  - '@codex'
created_date: '2026-04-02 15:47'
updated_date: '2026-04-02 16:42'
labels: []
dependencies: []
references:
  - tests/bdd/support/platform-fixtures.ts
  - tests/bdd/bootstrap.ts
documentation:
  - docs/README.md
  - docs/domain-model.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Repair the authenticated BDD platform fixture seed so local bootstrap succeeds after the hackathon `country` field became required. The current `tests/bdd/support/platform-fixtures.ts` `insert into hackathons` block has mixed tuple widths because most fixture rows still provide `city` and `address` but omit `country`, causing `bun tests/bdd/bootstrap.ts` to fail with `D1_ERROR: all VALUES must have the same number of terms: SQLITE_ERROR` before authenticated browser coverage can run.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The authenticated BDD hackathon fixture seed provides a valid `country` value for every inserted hackathon row and no longer uses mixed-width insert tuples.
- [x] #2 `bun tests/bdd/bootstrap.ts` completes successfully against the local BDD D1 state.
- [x] #3 The participant team authenticated BDD coverage relevant to the Team-tab migration runs successfully after bootstrap.
- [x] #4 Required local validation for the touched work passes: `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Repair the `tests/bdd/support/platform-fixtures.ts` `insert into hackathons` seed so every row follows the canonical `city, country, address` shape and uses location values consistent with the existing fixture cities.
2. Re-run `bun tests/bdd/bootstrap.ts` to verify the local BDD fixture reset succeeds, then run the participant-team authenticated BDD coverage that was previously blocked by bootstrap.
3. Re-run `bun run lint`, `bun run typecheck`, and `bun run test:unit` for the combined workspace changes, then finalize the task, commit the task file with the code changes, and push `main` to `origin/main`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Discovered that the original BDD bootstrap failure masked a second local-D1 fixture issue. `resetPlatformFixtures()` was seeding through `getPlatformProxy()`, but those writes were not visible to the Wrangler-backed local D1 database used by `nuxt dev` and Playwright. Reworked fixture reset to import the generated SQL through `wrangler d1 execute --file` and fixed a missing `delete from user_auth_identities` statement that had been aborting the Wrangler import with a foreign-key failure before hackathons were seeded.

Verified targeted authenticated BDD with `bun tests/bdd/bootstrap.ts && bddgen && playwright test ... --project chromium-authenticated-bdd` after setting the authenticated project to `workers: 1`.

Docs remained canonical and unchanged; the fixes were implementation/test-path alignment only.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Repaired the authenticated BDD fixture reset by adding canonical `country` values to every seeded hackathon row, seeding current platform-document acceptances for all stable fixture users, and moving fixture import onto the Wrangler-backed local D1 path that Playwright actually uses. Fixed the reset order by clearing `user_auth_identities` before `users`, then updated the participant Team workspace to use the canonical hackathon id already available from the account page, pre-hydrate the current team when the caller already belongs to one, and simplify the Team-directory/profile form state so create/profile actions no longer lose values during hydration. Authenticated Team BDD coverage now runs successfully after bootstrap, and the `chromium-authenticated-bdd` project is configured with `workers: 1` to avoid shared-persona parallel flakiness in the canonical test path. Validation passed locally: `bun run lint`, `bun run typecheck`, `bun run test:unit`, plus targeted authenticated BDD for `team-workspace.feature` and `team-submission.feature`.
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
