---
id: TASK-181
title: Add team bio to team profiles
status: Done
assignee:
  - codex
created_date: '2026-04-04 11:03'
updated_date: '2026-04-04 11:12'
labels: []
dependencies: []
documentation:
  - /Users/alex/projects/codex-hackathons/docs/domain-model.md
  - /Users/alex/projects/codex-hackathons/docs/api-surface.md
  - /Users/alex/projects/codex-hackathons/docs/schema-outline.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Participants need a short multiline team bio so each team can introduce itself in the team workspace and related team-visibility surfaces.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Canonical docs define an optional multiline team bio on the team model and keep API and schema documentation aligned with that field.
- [x] #2 Team persistence and API reads or writes support the team bio through the existing team profile flow without introducing a separate team-settings path.
- [x] #3 Team admins can edit the bio in the participant team workspace with multiline validation aligned to the existing profile bio pattern.
- [x] #4 Visible team surfaces show the saved team bio where team details are already presented.
- [x] #5 Relevant automated tests cover the changed server and client behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update canonical docs to define an optional team bio on the Team entity and reflect it in the API and schema docs.
2. Add the persistent team bio field in the database schema and checked-in D1 migration, following the existing optional bio conventions used on user profiles.
3. Extend team create, read, list, and update flows so the existing team profile path accepts and returns bio without introducing a separate settings route.
4. Update the participant Team tab state, validation, and UI so team admins can edit a multiline bio and team visibility surfaces render it where team details are already shown.
5. Update server, client, and BDD tests for the new field, then run bun run lint, bun run typecheck, and bun run test:unit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Discovery completed against the current team schema, API routes, workspace composable, participant team panel, and related tests. Existing team profile editing already flows through PATCH /api/hackathons/:hackathonId/teams/:teamId and is the natural extension point for an optional multiline team bio.

User approved the plan and confirmed the intended visibility model: team bio should be visible anywhere team data is already visible today.

Added optional `teams.bio` as the canonical persisted field, including docs updates, Drizzle schema changes, and a checked-in D1 migration.

Extended the existing team profile create/read/update flow to accept and return bio, normalized empty bio values to null on write, and exposed bio on list and detail responses so existing visible team surfaces can render it without extra endpoints.

Updated the participant Team tab to edit bio in the existing team profile form, render saved bios in the team workspace and team directory, and surface bios in the admin team visibility panel.

Validation results: `bun run lint` passed, `bun run typecheck` passed, `bun run test:unit` passed, and `bun x vitest run --config vitest.integration.config.ts tests/integration/server/api/team-formation-routes.test.ts` passed.

Auth0-backed BDD coverage was updated for the participant team workflow but not executed locally in this pass because the browser/Auth0 bootstrap suite was not run.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added an optional multiline team bio to the canonical team model and threaded it through the existing team profile workflow instead of introducing a new settings surface. The change includes canonical docs updates, a D1 migration and schema field, create/read/update API support, participant workspace editing, and rendering on participant and admin team visibility surfaces.

Validation and coverage were updated alongside the behavior change. The local checks that ran successfully were `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bun x vitest run --config vitest.integration.config.ts tests/integration/server/api/team-formation-routes.test.ts`. Auth0-backed BDD files were updated for the participant Team tab flow, but that suite was not executed locally in this pass.
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
