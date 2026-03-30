---
id: TASK-126
title: Restore sidebar background styling in shared shell layouts
status: Done
assignee:
  - '@codex'
created_date: '2026-03-30 20:47'
updated_date: '2026-03-30 21:07'
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
Discovery showed the likely trigger on March 30, 2026 was TASK-114 (commit b23aebf), which changed the profile shell sidebar container from fixed to sticky as part of the mobile/responsive sidebar improvement. The first follow-up restored the production sidebar colors. The final fix keeps those production colors, moves the full-height sidebar background and border to the aside column itself, and changes the hackathon-detail sidebar panel from fixed to sticky so the sidebar spans the page height and no longer sits outside the page scroll container.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
The sidebar regression came from the recent shared shell/mobile sidebar work: the sidebar background was only applied to the inner panel and the hackathon-detail sidebar still used a fixed overlay, which caused the visible background to stop spanning the full page height and blocked page scrolling when hovering the sidebar. The final fix keeps the production sidebar colors (`bg-white/70` and `dark:bg-black/70`), moves the background and border to the full aside column in profile and hackathon-detail layouts, and switches the hackathon-detail panel from fixed to sticky so it stays inside the page scroll container. Validation passed: bun run lint (existing vue/no-v-html warnings only), bun run typecheck, and bun run test:unit. No docs or config changes were needed.
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
