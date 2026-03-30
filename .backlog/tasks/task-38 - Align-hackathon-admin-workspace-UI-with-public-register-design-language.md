---
id: TASK-38
title: Align hackathon admin workspace UI with public/register design language
status: In Progress
assignee:
  - '@codex'
created_date: '2026-03-27 17:45'
updated_date: '2026-03-30 22:05'
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
1. Extract a reusable admin editor row shell component that matches the current agenda item layout: controls column on the left, main form/content in the center, destructive action on the right.
2. Add subtle vertical delimiters inside the shell between the left controls and center content, and between the center content and right-side delete action.
3. Migrate the schedule agenda rows in `app/components/admin/HackathonConfigForm.vue` to the shared shell first, preserving existing move/drag/delete behavior and field bindings.
4. After the shared shell is proven in the schedule editor, reuse it for prize rows in the hackathon admin settings panel so both editors share the same structure.
5. Validate with `bun run lint`, `bun run typecheck`, and `bun run test:unit`, then summarize any residual gaps.

6. Extract the duplicated shared-shell sidebar wrapper from `app/layouts/profile.vue` and `app/layouts/hackathon-detail.vue` into a single reusable shell component so the sidebar background, border, positioning, and collapse affordances cannot drift between layouts.

7. Revise the prize configuration UX to use a single bottom save action instead of `Save prize order` and per-row `Save updates`, make each prize row fill the available width, add per-row delete affordances consistent with the schedule editor, and replace the separate draft-style add-prize form with a simple bottom-left `Add prize` action that inserts a new editable row into the list.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented a scoped visual migration only for the three hackathon admin routes by introducing an `.admin-modern-surface` wrapper and register-style overrides for cards/inputs, avoiding behavior/API changes.

Updated shared admin chrome components so the header and workspace tabs align with the public/register top-surface visual language while preserving existing admin text and route targets used by BDD flows.

Validated desktop and mobile rendering manually at localhost admin/settings, admin/operations, and admin/competition after implementation.

Reopened after UX review feedback: the prior scoped override approach still felt like nested card layering. Follow-up implementation will remove override-driven styling and switch admin surfaces to the same flat utility composition pattern used on public/register pages.

Extracted a reusable admin editor row shell component with a slotted center content area and built-in separators between controls, main content, and right-side actions.

Migrated the schedule agenda rows in `app/components/admin/HackathonConfigForm.vue` to the shared shell while preserving move up/down, drag handle, delete, and existing field bindings.

Validation passed with `bun run lint` (existing unrelated `vue/no-v-html` warnings only), `bun run typecheck`, and `bun run test:unit`.

Extracted the shared shell sidebar into `app/components/shell/AppShellSidebar.vue`, preserving the known-good fixed sidebar markup, background, border, blur, and collapse storage key from production.

Updated `app/layouts/profile.vue` and `app/layouts/hackathon-detail.vue` to consume the shared sidebar component so sidebar background changes now live in one place.

Validation passed with `bun run lint` (existing unrelated `vue/no-v-html` warnings only), `bun run typecheck`, and `bun run test:unit`.

Reused `app/components/admin/AdminEditorRowShell.vue` for existing prize rows in `app/components/account/hackathons/AccountHackathonAdminSettingsPanel.vue`, moving reorder controls to the left gutter and the row save action to the right slot while keeping the existing prize bindings and actions unchanged.

Capped the visual width of the prize name and reward type controls within the shared shell so those fields no longer stretch across the full editor width.

Validation passed with `bun run lint` (existing unrelated `vue/no-v-html` warnings only), `bun run typecheck`, and `bun run test:unit`.

Patched the shared authenticated shell so the footer offsets itself by the live sidebar width on large screens instead of centering against the full viewport. The sidebar and footer now share the same collapse state key and width helpers, which prevents the expanded fixed sidebar from covering the footer cookie/local-storage disclosure copy on account-facing layouts. Validation: bun run lint (existing vue/no-v-html warnings only), bun run typecheck, bun run test:unit.
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
