---
id: TASK-272
title: Add member cards to the winner showcase team section
status: Done
assignee: []
created_date: '2026-04-18 12:30'
updated_date: '2026-04-18 12:30'
labels:
  - ui
  - winners
  - bugfix
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Wrap each winner showcase team member in an existing card-style surface so the team section reads as distinct member entries instead of an unframed list.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Each winner showcase team member renders inside a distinct card-like surface using existing local styling patterns.
- [x] #2 The winner showcase keeps the existing member content, links, and payload contract while improving the team section hierarchy.
- [x] #3 Required local validation passes for the affected UI change.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Updated `app/components/public/hackathons/HackathonWinnersShowcase.vue` so the team-members list uses a compact inset card around each member entry. The component now reuses the existing `hackathon-workspace-detail-inset` surface pattern from nearby roster UI instead of rendering an unframed list.

This remains a presentational-only winners showcase change. No payload, routing, or shared design-system primitive changed.

Nested member surfaces were kept intentionally narrow and reuse an existing local inset style because the user explicitly requested cards around each team member.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added individual member cards to the winner showcase team section in `app/components/public/hackathons/HackathonWinnersShowcase.vue` by wrapping each member entry in the existing `hackathon-workspace-detail-inset` surface with compact spacing. That preserves the current avatar, name, bio, and social-link layout while giving each team member a clearer visual boundary.

No docs, config, auth, or payload changes were required. No targeted tests were added because this is a markup-only styling adjustment; repo-wide validation passed with `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
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
- [x] #9 No new design-system primitive was introduced for the team-member card treatment.
<!-- DOD:END -->
