---
id: TASK-291.4
title: Refactor route-level hackathon fetches onto Nuxt data composables
status: Done
assignee:
  - agent-route-fetch
created_date: '2026-04-25 20:45'
updated_date: '2026-04-25 21:10'
labels:
  - nuxt
  - data-fetching
dependencies:
  - TASK-291.2
references:
  - AGENT-SPAWN-NOTES.md
documentation:
  - docs/README.md
  - docs/domain-model.md
  - 'https://nuxt.com/docs/4.x/getting-started/data-fetching'
  - 'https://nuxt.com/docs/4.x/api/composables/use-async-data'
  - 'https://nuxt.com/docs/4.x/api/composables/use-fetch'
parent_task_id: TASK-291
priority: high
ordinal: 1400
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace raw route setup API fetches in public hackathon-facing pages with the shared Nuxt API data-fetching layer. Scope excludes the account hackathon workspace page, admin workspace composables, server routes, and database code so it can run independently after the shared fetch layer lands.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Public hackathon route pages use Nuxt-managed data composables for SSR-visible API reads instead of raw awaited `$fetch` or manual `useRequestFetch` selection.
- [x] #2 Each migrated fetch has stable cache-key behavior and preserves existing loading/error semantics.
- [x] #3 Non-critical route data is lazy or deferred where that does not change the user-visible first render contract.
- [x] #4 The account hackathon workspace page is not modified in this task.
- [x] #5 `bun run lint`, `bun run typecheck`, and `bun run test:unit` pass, or any inability to run them is recorded in the task summary.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approved implementation plan:
1. Refactor public hackathon route pages that currently use raw awaited `$fetch`/`useRequestFetch` for SSR-visible API reads onto the shared Nuxt API data composables from TASK-291.2.
2. Preserve current 404/error behavior, SEO metadata, and first-render data requirements.
3. Use stable keys for each migrated request and defer/lazy-load only clearly non-critical data where that does not change the visible first render contract.
4. Do not modify the account hackathon workspace page, admin workspace composables/panels, server routes, database schema, or UI lazy-loading work.
5. Run `bun run lint`, `bun run typecheck`, and `bun run test:unit`; report any validation limitation without marking the task Done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Coordinator/user approved starting TASK-291.4 after TASK-291.2 completion. Worker write scope is limited to public hackathon route fetch refactors and focused tests if needed.

Coordinator replaced silent worker Lagrange after repeated missed status checks and no observed file changes. Task remains In Progress; replacement worker will continue same approved scope.

Coordinator review found and fixed one SSR redirect risk in `app/pages/hackathons/[slug]/register.vue`: redirect handling now awaits the initial navigation at top level and uses a non-immediate watcher only for later client-side changes. Integrated validation passed after the fix: `bun run lint`, `bun run typecheck`, `bun run test:unit`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Refactored public hackathon route pages under `app/pages/hackathons/[slug]` to use the shared Nuxt API data composables for SSR-visible reads instead of raw awaited `$fetch`/manual `useRequestFetch` selection. Preserved existing 404/error handling and SSR registration redirects; coordinator tightened the registration redirect back to a top-level awaited `navigateTo` after review. Account workspace, admin workspace, server routes, database code, and shared fetch-core implementation were not modified by this task. Validation passed: `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
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
