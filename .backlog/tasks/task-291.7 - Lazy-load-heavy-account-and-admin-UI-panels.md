---
id: TASK-291.7
title: Lazy-load heavy account and admin UI panels
status: Done
assignee:
  - '@agent-ui-lazy'
created_date: '2026-04-25 20:45'
updated_date: '2026-04-25 21:33'
labels:
  - nuxt
  - frontend-performance
dependencies:
  - TASK-291.5
references:
  - AGENT-SPAWN-NOTES.md
documentation:
  - docs/README.md
  - docs/domain-model.md
  - 'https://nuxt.com/blog/v4-1'
  - 'https://nuxt.com/docs/4.x/directory-structure/app/components'
parent_task_id: TASK-291
priority: medium
ordinal: 1600
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Apply Nuxt component loading and hydration improvements to heavy account/admin UI surfaces after the admin workspace eager-loading work is integrated. Scope is limited to route/component loading behavior for large UI panels and client-only editor/gallery code; do not change database queries or API response contracts.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Large hidden account hackathon tab panels are lazy-loaded where that does not change the active tab's initial render behavior.
- [x] #2 Client-only editor, gallery, drag/drop, and admin operation surfaces avoid shipping or hydrating heavy code before the user can interact with them.
- [x] #3 Loading and empty states remain usable and accessible for all affected panels.
- [x] #4 This task starts only after the admin workspace loading changes are integrated, to avoid editing the same route/page at the same time.
- [x] #5 `bun run lint`, `bun run typecheck`, and `bun run test:unit` pass, or any inability to run them is recorded in the task summary.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Coordinator-approved plan:
1. Inspect the account hackathon workspace page and heavy account/admin panel imports after TASK-291.5.
2. Lazy-load large hidden tab panels using Nuxt component lazy-loading conventions where the active tab still renders correctly on initial load.
3. Gate client-only/heavy editor, gallery, drag/drop, and admin-operation surfaces with existing visibility conditions rather than changing data/API behavior.
4. Keep changes limited to account/admin UI loading behavior; do not change server routes, database queries, API contracts, or product copy.
5. Run `bun run lint`, `bun run typecheck`, and `bun run test:unit`; report results to the coordinator without committing or marking the task Done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Coordinator approved starting after TASK-291.5 completed. Write scope is limited to account/admin UI loading behavior and directly affected tests if needed. Avoid server, database, route contract, and query changes. Worker must not commit or mark Done; coordinator will review and finalize.

Worker started scoped implementation after confirming TASK-291.5 is Done. Discovery is focused on account hackathon tab components, admin settings/operations panels, client-only markdown editor, gallery, and Sortable-powered drag/drop components.

Worker implementation landed for review. Hidden account workspace tabs now use Nuxt lazy component wrappers; nested admin operation, participant, team, judging, markdown-editor, and drag/drop-heavy surfaces are lazy-loaded where visibility gates already exist. Sortable-powered editors now dynamically import `sortablejs` only on the client after their sortable list is mounted. No server routes, database files, API contracts, product docs, or unrelated shared UI were changed. Validation passed: `bun run lint`, `bun run typecheck`, `bun run test:unit`. Worker did not commit or mark the task Done.

Coordinator reviewed and accepted the UI lazy-loading patch. Account hackathon tab panels now use Nuxt lazy component wrappers; nested judging/team/participant/admin operation surfaces are lazy behind existing visibility gates; markdown editor client and Sortable-powered editors avoid loading heavy client modules before they are mounted and usable. No docs/config changes were needed beyond existing Nuxt component conventions. Integrated validation passed: `bun run lint`, `bun run typecheck`, `bun run test:unit`, and focused server integrations shared with the final lane.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Lazy-loaded heavy account and admin UI surfaces while preserving active-tab behavior.

Key changes:
- Switched large hidden account hackathon tab panels to Nuxt lazy component wrappers.
- Lazy-loaded nested admin operation, judging, team, participant, roster, gallery, feedback, prize, timeline, tracks, and agenda panels behind existing tab/panel visibility conditions.
- Deferred markdown editor client loading and changed Sortable-powered editors to import `sortablejs` dynamically on the client after the relevant list is mounted.

Validation passed:
- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`
- `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/outcome-routes.test.ts tests/integration/server/api/submission-routes.test.ts tests/integration/server/api/team-formation-routes.test.ts`

Risks/follow-ups:
- No product docs, server routes, database queries, or API contracts changed.
- No new UI tests were added because this changes loading/chunk boundaries rather than user-facing behavior; existing validation covers compile-time component resolution and unit regressions.
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
