---
id: TASK-38
title: Align hackathon admin workspace UI with public/register design language
status: In Progress
assignee:
  - '@codex'
created_date: '2026-03-27 17:45'
updated_date: '2026-03-27 18:32'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Bring the hackathon admin workspace at /hackathons/:slug/admin (including settings, operations, and competition surfaces) onto the same visual UI language used by the public hackathon detail and register routes. Keep all existing admin behavior and API interactions unchanged while updating navigation tabs, card treatments, and form controls to match the newer shared UI direction.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Settings, Operations, and Competition admin surfaces use the same top header and tab visual language as the hackathon detail/register pages
- [x] #2 Admin workspace cards, metric blocks, and form controls use the same card/input style family used on the register surface
- [x] #3 Admin actions and data behavior remain unchanged, including existing data-testid hooks used by BDD flows
- [x] #4 All three admin subroutes remain responsive and readable on desktop and mobile widths
- [x] #5 Validation is run locally with at least bun run test:unit, and any unrun validations are explicitly documented
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Proposed implementation plan (pending user approval):
1) Rework admin hackathon page chrome to match the public/register style by updating the three slug admin pages (`app/pages/hackathons/[slug]/admin/index.vue`, `operations.vue`, `competition.vue`) to use a top bordered/glass section with `max-w-[68rem]` containers and the shared admin header + tab strip.
2) Restyle shared admin header and tabs components (`app/components/admin/AdminWorkspaceHeader.vue`, `AdminHackathonWorkspaceTabs.vue`) so tabs follow the same underline/tab treatment used on the hackathon detail/register pages and the heading typography aligns with that surface.
3) Introduce scoped admin-surface style overrides in `app/assets/css/main.css` under a wrapper class (for example `.admin-modern-surface`) so admin cards and controls (`[data-slot="card"]`, `.app-inset-card`, `.app-inset-card-tight`, `.app-inset-field`) match register-style card/input visuals without changing non-admin pages.
4) Update remaining admin-only metric blocks in the three admin pages to use a shared register-style metric class and keep existing labels/test ids intact.
5) Validate with `bun run test:unit` and report any gaps if broader checks are not run.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented a scoped visual migration only for the three hackathon admin routes by introducing an `.admin-modern-surface` wrapper and register-style overrides for cards/inputs, avoiding behavior/API changes.

Updated shared admin chrome components so the header and workspace tabs align with the public/register top-surface visual language while preserving existing admin text and route targets used by BDD flows.

Validated desktop and mobile rendering manually at localhost admin/settings, admin/operations, and admin/competition after implementation.

Reopened after UX review feedback: the prior scoped override approach still felt like nested card layering. Follow-up implementation will remove override-driven styling and switch admin surfaces to the same flat utility composition pattern used on public/register pages.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented a UI-only refactor of the hackathon admin workspace to align with the newer public/register visual language.

What changed:
- Updated shared admin chrome components:
  - `app/components/admin/AdminWorkspaceHeader.vue`
  - `app/components/admin/AdminHackathonWorkspaceTabs.vue`
- Updated the three hackathon admin routes to use the new top chrome pattern and consistent `max-w-[68rem]` surface framing:
  - `app/pages/hackathons/[slug]/admin/index.vue`
  - `app/pages/hackathons/[slug]/admin/operations.vue`
  - `app/pages/hackathons/[slug]/admin/competition.vue`
- Added admin-scoped styling in `app/assets/css/main.css` under `.admin-modern-surface` to restyle cards and form controls (`[data-slot="card"]`, `.app-inset-card`, `.app-inset-card-tight`, `.app-inset-field`) to the same card/input family used on register/public surfaces.
- Converted admin metric blocks to a shared `admin-surface-metric` class for consistent register-style card treatment.

Why:
- The admin pages were visually inconsistent with the newer UI language used on hackathon detail/register surfaces. This change brings tabs, cards, and inputs into that same system without changing domain behavior.

Behavior/testing impact:
- Preserved existing admin workflows and action wiring; this is a presentation-layer refactor.
- Preserved existing admin labels and data-testid hooks used by BDD flows.

Validation run:
- `bun run lint` (passes; existing unrelated `vue/no-v-html` warnings remain in public/account pages)
- `bun run typecheck` (passes)
- `bun run test:unit` (passes)
- Manual runtime checks on localhost for settings/operations/competition routes at desktop and mobile viewport.

Risks/follow-ups:
- No functional regressions observed in local checks. If desired, run full `bun run test:bdd` for end-to-end UI path verification beyond unit coverage.
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
