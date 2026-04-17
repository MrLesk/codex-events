---
id: TASK-241
title: Surface the shortlist editor immediately in Operations during shortlist
status: Done
assignee:
  - '@codex'
created_date: '2026-04-17 13:38'
updated_date: '2026-04-17 13:39'
labels:
  - judging
  - admin
  - frontend
  - ux
dependencies: []
documentation:
  - app/components/account/hackathons/AccountHackathonAdminOperationsPanel.vue
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fix the Operations tab shortlist-state layout so admins see the shortlist editor immediately instead of a large lifecycle summary card that tells them to use the same tab they are already on.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 During `shortlist`, the shortlist editor appears before or instead of the redundant lifecycle summary card so it is immediately visible in the Operations tab.
- [x] #2 Operations shortlist copy no longer tells admins to use the Operations tab from within the Operations tab.
- [x] #3 Required validation passes for the changed area.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
L1 micro-brief: the issue was caused by the lifecycle hero card being rendered ahead of the shortlist editor inside the Operations section, which pushed the actual workflow below the fold and left only self-referential Operations copy visible. The fix was to treat `shortlist` as a primary workflow state by showing the shortlist editor first and hiding the lifecycle hero card for that state.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated `AccountHackathonAdminOperationsPanel.vue` so the shortlist editor renders before the lifecycle summary card and the hero card is hidden entirely during `shortlist`.

Also simplified the shortlist visibility guard to key directly off the `shortlist` state, which avoids hiding the shortlist editor behind extra stage flags once the hackathon is already in that lifecycle state.

Validation passed with `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [x] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
