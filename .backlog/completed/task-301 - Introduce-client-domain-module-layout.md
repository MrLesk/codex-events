---
id: TASK-301
title: Introduce client domain module layout
status: Done
assignee:
  - Codex
created_date: '2026-04-29 16:59'
updated_date: '2026-04-29 17:18'
labels:
  - architecture
  - client
  - vue
  - refactor
dependencies:
  - TASK-300
documentation:
  - docs/README.md
  - docs/domain-model.md
  - docs/api-surface.md
modified_files:
  - app/domains/applications/participant-application.ts
  - app/domains/applications/admin-application-review.ts
  - app/components/applications/ParticipantApplicationRegistrationPanel.vue
  - app/components/applications/AdminApplicationsReviewPanel.vue
  - app/components/account/hackathons/AccountHackathonParticipantsPanel.vue
  - 'app/pages/hackathons/[slug]/register.vue'
  - tests/unit/app/domains/applications/participant-application.test.ts
  - tests/unit/app/domains/applications/admin-application-review.test.ts
  - vitest.config.ts
  - vitest.integration.config.ts
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Reorganize client-side Vue and app logic away from generic buckets into clearer feature/domain modules after the server-side layout is established. Keep user-facing behavior unchanged and migrate in conservative slices so screens, composables, and API clients are easier to navigate.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Client-side feature logic has explicit homes aligned with the server/domain language where practical.
- [x] #2 At least one cohesive Vue/app feature slice is moved out of generic utility structure with imports updated.
- [x] #3 User-facing routes, copy, and behavior remain unchanged unless explicitly approved.
- [x] #4 The task records intended client module boundaries for additional follow-up refactors.
- [x] #5 Required repository validation passes with `bun run lint`, `bun run typecheck`, and `bun run test:unit`; relevant UI or route checks are run when touched.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Establish an application-domain client module under `app/domains/applications` for participant application and admin review logic.
2. Move application-specific Vue components into an applications component namespace while preserving rendered behavior.
3. Update imports from generic `app/utils` paths to the new domain paths.
4. Move matching unit tests into domain-aligned test folders.
5. Run focused tests plus required lint/typecheck/unit validation; run integration if route behavior is touched.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Initial client slice scope:
- `app/domains/applications`: participant application models/policies/formatters and admin application review grouping/search logic.
- `app/components/applications`: Vue components whose primary workflow is application submission/review.
- Keep global UI primitives, shell, generic formatting, and unrelated hackathon/team/judging modules in place for later slices.
- Preserve Nuxt component auto-import/lazy import behavior by updating `#components` aliases where moved components are lazy-loaded.

Implemented the first client application-domain slice. Participant application helper models/policies and admin application review grouping/search now live under `app/domains/applications`. Application submission/review Vue panels now live under `app/components/applications`; lazy admin review loading is preserved through the updated `#components` alias import.

Added the Nuxt `~` app alias to Vitest unit/integration configs because moved app modules now import domain modules through the same alias Nuxt typecheck already resolves.

Validation passed: `bunx vitest run tests/unit/app/domains/applications`; focused dependent app utility/composable tests; `bun run lint`; `bun run typecheck`; `bun run test:unit`; `bun run test:integration`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Introduced the first client/Vue domain module slice for applications. Application-specific helper logic moved from `app/utils` to `app/domains/applications`, the registration and admin application review Vue panels moved to `app/components/applications`, imports were updated across pages, components, composables, and dependent utilities, and matching unit tests moved under `tests/unit/app/domains/applications`. Public UX and route behavior are unchanged.
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
