---
id: TASK-126
title: Restore sidebar background styling in shared shell layouts
status: In Progress
assignee:
  - '@codex'
created_date: '2026-03-30 20:47'
updated_date: '2026-03-30 20:54'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Investigate and fix the recent regression where the shared account/sidebar shell lost its background color. Keep the fix scoped to the shared shell/sidebar implementation and preserve the intended content surface styling in profile and hackathon-detail layouts.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The shared account/sidebar shell shows the intended sidebar background color again in the affected layouts
- [x] #2 The fix is scoped to the shared shell/sidebar implementation rather than page-specific overrides unless discovery proves otherwise
- [x] #3 Profile and hackathon-detail layouts still render their content surfaces correctly after the fix
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Discovery showed the likely trigger on March 30, 2026 was TASK-114 (commit b23aebf), which changed the profile shell sidebar container from fixed to sticky as part of the mobile/responsive sidebar improvement. The sidebar surface class itself still used bg-white/70, which became too low-contrast in light mode and read as if the background color was gone. Final fix: keep the responsive/mobile behavior from TASK-114, but restore visible shell contrast by switching the sidebar surface in the shared profile and hackathon-detail layouts from bg-white/70 to bg-default/88.

User clarified that production uses the intended sidebar background colors and only wants the shared sidebar background colors reverted to match production markup. No new commit requested for this follow-up.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
The recent March 30, 2026 sidebar/mobile change in TASK-114 was the likely trigger on the profile shell. It changed the sidebar positioning behavior, which exposed that the current light-mode sidebar surface was still using bg-white/70 and therefore blended into the page background. Updated the shared sidebar surface in app/layouts/profile.vue and app/layouts/hackathon-detail.vue to use bg-default/88 instead. That restores visible background contrast without undoing the responsive/mobile sidebar behavior. Validation passed: bun run lint (existing vue/no-v-html warnings only), bun run typecheck, and bun run test:unit. No docs or config changes were needed.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
