---
id: TASK-12
title: Fix homepage color-mode support for the Figma-style public surface
status: Done
assignee: []
created_date: '2026-03-24 19:21'
updated_date: '2026-03-24 19:25'
labels:
  - frontend
  - theme
  - bug
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the homepage's hardcoded dark-only shell and card classes with theme-aware light/dark variants so the color-mode toggle works while keeping the Figma-inspired stacked discovery design in dark mode.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The homepage changes visually when the color-mode toggle switches between dark and light.
- [x] #2 The Figma-style stacked hackathon list layout is preserved in dark mode.
- [x] #3 Typecheck and lint pass after the theme fix.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Replaced the homepage's hardcoded dark-only shell, filter bar, empty state, load-more button, and stacked card colors with theme-aware light/dark classes in `app/app.vue`, `app/pages/index.vue`, and `app/components/public/hackathons/HackathonCard.vue`.

Verified in Chrome DevTools that toggling the color-mode button flips the document out of `.dark`, changes the homepage body background to the light theme gradient, changes the header to a light surface, and switches homepage cards to white backgrounds.

Validation passed with `bun run typecheck` and `bun run lint`. The full BDD suite was not run in this pass.

Adjusted the homepage light-mode subtitle, inactive filter labels, count label, and footer text to darker foreground colors so they meet contrast requirements on white and near-white surfaces.

Re-ran Lighthouse snapshot auditing on the homepage after the fix; accessibility is now 100 with zero contrast failures.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed the homepage color-mode bug by removing the hardcoded dark-only styling from the Figma-inspired public surface and replacing it with paired light/dark classes. Dark mode keeps the intended stacked discovery look, while light mode now visibly switches the shell, filter bar, and hackathon cards to the light theme. Verified in-browser with DevTools, and both `bun run typecheck` and `bun run lint` pass.

A follow-up contrast pass strengthened the remaining light-theme text colors on the homepage and footer. Lighthouse now reports accessibility 100 with no color-contrast failures, and both `bun run typecheck` and `bun run lint` still pass.
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
