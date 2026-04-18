---
id: TASK-271
title: Center winner showcase profile icons against member content
status: Done
assignee: []
created_date: '2026-04-18 12:28'
updated_date: '2026-04-18 12:28'
labels:
  - ui
  - winners
  - bugfix
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Adjust the completed winners showcase team-member layout so each profile icon is vertically centered against the full member content block instead of aligning only to the first text row.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Winner showcase team-member profile icons are vertically centered against the corresponding member content stack.
- [x] #2 The winners showcase keeps the existing member name, bio, and social-link layout without introducing a new component or changing the payload contract.
- [x] #3 Required local validation passes for the affected UI change.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Updated `app/components/public/hackathons/HackathonWinnersShowcase.vue` so each winner team-member row is a single avatar-plus-content flex layout. The avatar now sits beside the full name/bio/social-link stack instead of aligning only against the first text row, which vertically centers the profile icon for members with link pills or longer copy.

This is a presentational-only change in the existing winners showcase. No API shape, data flow, or shared design-system primitive changed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Centered winner showcase profile icons by restructuring each team-member entry in `app/components/public/hackathons/HackathonWinnersShowcase.vue` into a single flex row with the avatar beside the full member content stack. That keeps the existing name, bio, and social-link layout while aligning the icon vertically against the whole block instead of just the first line of text.

No docs, config, auth, or payload changes were required. No targeted test changes were added because this is a markup-only alignment fix; repo-wide validation passed with `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
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
- [x] #9 No new design-system primitive was introduced for the alignment fix.
<!-- DOD:END -->
