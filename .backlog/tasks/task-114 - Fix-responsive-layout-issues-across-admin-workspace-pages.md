---
id: TASK-114
title: Fix responsive layout issues across admin workspace pages
status: Done
assignee:
  - codex
created_date: '2026-03-30 15:52'
updated_date: '2026-03-30 16:44'
labels: []
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Audit the admin-facing account workspace on narrow and medium viewports, fix the reported footer and sidebar problems, and address other layout regressions that make admin pages hard to use responsively. Scope includes the shared account/profile shell used by admin pages and the main admin surfaces reached from the account admin dashboard.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Admin-facing account pages remain usable on narrow and medium viewports without the sidebar overlapping or hiding primary content.
- [x] #2 The shared shell footer stays readable and correctly positioned on admin pages across responsive breakpoints.
- [x] #3 The admin dashboard and hackathon admin surfaces avoid obvious horizontal overflow and keep primary actions and navigation accessible on common mobile and tablet widths.
- [x] #4 Responsive fixes follow existing app shell patterns and pass local lint, typecheck, and unit-test validation.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the shared `app/layouts/profile.vue` shell so narrow viewports do not keep the fixed workspace sidebar open over the content area. Add a mobile-safe navigation presentation while preserving the existing desktop collapsed sidebar behavior.
2. Adjust the shared account-shell footer placement and width treatment so it remains readable and does not sit underneath the fixed sidebar on admin/account pages.
3. Sweep the main admin-facing surfaces for responsive regressions tied to dense grid/flex layouts, focusing on `app/pages/account/admin.vue`, `app/pages/account/hackathons/[slug]/index.vue`, `app/components/admin/HackathonConfigForm.vue`, and the highest-density admin settings/competition panels.
4. Verify the changes with local validation: `bun run lint`, `bun run typecheck`, and `bun run test:unit`. Document any remaining test gaps or residual risks in the task notes/final summary.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented the shared account/profile-shell fix in `app/layouts/profile.vue`: the desktop workspace rail is now a sticky in-flow sidebar shown from `lg` upward, and narrow viewports use a toggleable inline account-navigation panel instead of an always-visible fixed sidebar.

Adjusted dense admin form controls for narrow widths: `app/components/admin/HackathonConfigForm.vue` now lets agenda-item controls wrap/stack on phones, and `app/components/account/hackathons/AccountHackathonAdminSettingsPanel.vue` now wraps criterion/prize action buttons instead of forcing a single row.

Validation results: `bun x eslint app/layouts/profile.vue app/components/admin/HackathonConfigForm.vue app/components/account/hackathons/AccountHackathonAdminSettingsPanel.vue` passed, `bun run typecheck` passed, and `bun run test:unit` passed.

Repo-level blockers remain outside this task: `bun run lint` currently fails in existing files (`server/middleware/local-d1-binding.ts`, `tests/support/backend/api-route.ts`, and `tests/unit/server/routes/auth/account-linking.test.ts`), and `bun tests/bdd/bootstrap.ts` currently fails during fixture reset with `D1_ERROR: all VALUES must have the same number of terms: SQLITE_ERROR`, which prevented an authenticated browser verification pass.

Follow-up UI cleanup removed the duplicate mobile account-navigation card from `app/layouts/profile.vue` and relies on the existing avatar menu for top-level mobile account navigation.

Removed the redundant `Account workspace` kicker from the admin and judging page headers so the account surfaces follow the simpler `My hackathons` header pattern.

The shared footer remains mobile-safe and readable, with centered small-screen text/link layout in `app/components/shell/AppShellFooter.vue`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed the responsive/admin shell pass across the account admin surfaces.

What changed:
- Reworked `app/layouts/profile.vue` so the workspace sidebar is desktop-only, in-flow, and sticky instead of overlapping content; later follow-up removed the duplicate mobile account-navigation card and left mobile top-level navigation to the existing avatar menu.
- Updated `app/components/admin/HackathonConfigForm.vue` so dense agenda-item controls wrap/stack cleanly on narrow viewports.
- Updated `app/components/account/hackathons/AccountHackathonAdminSettingsPanel.vue` so criterion/prize action clusters wrap instead of forcing overflow.
- Simplified the admin and judging page headers by removing the redundant `Account workspace` kicker.
- Updated the shared footer so its content stays centered/readable on small screens.

Validation:
- `bun x eslint app/layouts/profile.vue app/components/admin/HackathonConfigForm.vue app/components/account/hackathons/AccountHackathonAdminSettingsPanel.vue app/pages/account/admin.vue app/pages/account/judging.vue app/components/shell/AppShellFooter.vue`
- `bun run typecheck`
- `bun run test:unit`

Remaining limitation:
- `bun run lint` still fails in unrelated existing files outside this task (`server/middleware/local-d1-binding.ts`, `tests/support/backend/api-route.ts`, and `tests/unit/server/routes/auth/account-linking.test.ts`).
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [ ] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [ ] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
