---
id: TASK-410
title: Make public event tracks collapsible
status: Done
assignee: []
created_date: '2026-06-16 20:29'
updated_date: '2026-06-16 20:33'
labels: []
dependencies: []
modified_files:
  - app/components/public/events/EventTracksPanel.vue
ordinal: 89000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Public event track rows should start expanded so visitors can scan them immediately, while still allowing each track to be collapsed and expanded again to save space.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Public event tracks render expanded by default on the event detail page
- [x] #2 Each track can be collapsed and expanded independently
- [x] #3 The mobile layout keeps the compact no-arrow track row treatment
- [x] #4 Desktop keeps the existing track rail treatment while supporting collapse controls
- [x] #5 Repo validation passes for the component change
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reuse the existing native details/summary disclosure pattern instead of adding a new accordion primitive.
2. Wrap each public track row so it starts expanded with open.
3. Add a chevron affordance in the track header and preserve the mobile no-arrow layout plus desktop rail.
4. Validate with lint, typecheck, unit tests, and a rendered mobile/desktop check.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implementation notes:
- Reused the existing native details/summary disclosure pattern already present on third-party notices instead of introducing a new accordion primitive.
- Confirmed canonical docs unchanged: this only changes public presentation behavior for the existing track names/descriptions/resources.
- Validation passed: bun run lint, bun run typecheck, bun run test:unit.
- Browser verification passed at 390px and 1024px: tracks start open, individual tracks collapse/reopen independently, mobile rail stays hidden, desktop rail stays visible.
- No component test added because the repo has no Vue component-test harness for public panels; behavior was verified in the rendered app.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Public event tracks now render as expanded native disclosure rows. Visitors can collapse and expand each track independently, mobile keeps the compact no-arrow layout, and desktop keeps the existing rail treatment.

No follow-up is currently identified; the implementation uses the same native disclosure pattern already present elsewhere in the app.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [x] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
