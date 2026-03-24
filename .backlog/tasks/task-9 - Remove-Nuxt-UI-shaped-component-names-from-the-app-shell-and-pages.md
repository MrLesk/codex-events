---
id: TASK-9
title: Remove Nuxt UI-shaped component names from the app shell and pages
status: Done
assignee: []
created_date: '2026-03-24 18:55'
updated_date: '2026-03-24 18:57'
labels:
  - frontend
  - design-system
  - refactor
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the temporary `U*` compatibility layer with project-native component names, update all app/page call sites, and delete the old Nuxt UI-shaped wrapper files so the codebase reads as a shadcn/Tailwind app rather than a Nuxt UI migration.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 No `U*` compatibility components remain under `app/components`.
- [x] #2 Application pages and shared components no longer reference `UAlert`, `UButton`, `UCard`, `UBadge`, `UContainer`, `UIcon`, or related `U*` names.
- [x] #3 Typecheck and lint pass after the rename and cleanup.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Renamed the temporary `U*` wrapper files to project-native component names (`AppAlert`, `AppButton`, `AppCard`, `AppBadge`, `AppContainer`, `AppIcon`, `AppInput`, `AppCheckbox`, `AppAvatar`, `AppDropdownMenu`, `AppFormField`, `AppColorModeButton`, `PageHero`, `PageSection`).

Bulk-updated app shell, pages, and shared components to consume the renamed components, removing the old Nuxt UI-shaped surface from application code.

Updated `DEVELOPMENT.md` so contributor docs describe the current shared component structure instead of the previous `U*` wrapper path.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Removed the remaining Nuxt UI-shaped component layer from the app by renaming the temporary `U*` wrappers to project-native component names and updating all app/page call sites. Verified there are no `<U...>` component usages left under `app/`, and both `bun run typecheck` and `bun run lint` pass. No product behavior changed; this was a codebase/API-surface cleanup to make the frontend read as a native shadcn/Tailwind implementation.
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
