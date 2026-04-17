---
id: TASK-239
title: Move shortlist workflow into the account hackathon Operations surface
status: Done
assignee:
  - '@codex'
created_date: '2026-04-17 13:23'
updated_date: '2026-04-17 13:26'
labels:
  - judging
  - admin
  - frontend
  - ux
dependencies: []
documentation:
  - docs/lifecycle-and-state-machines.md
  - app/components/account/hackathons/AccountHackathonAdminOperationsPanel.vue
  - app/components/account/hackathons/AccountHackathonCompetitionPanel.vue
  - 'app/pages/account/hackathons/[slug]/index.vue'
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Relocate the shortlist editor out of the secondary competition surface and make it part of the primary admin Operations workflow on the account hackathon page. The shortlist stage should be managed directly from Operations, while later pitch/final-deliberation surfaces can remain where they already live unless needed for consistency.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 During `shortlist`, the ordered shortlist editor renders in the primary Operations workflow rather than in the secondary competition panel.
- [x] #2 Operations copy and lifecycle guidance reference the shortlist editor from Operations instead of the Competition tab.
- [x] #3 The secondary competition panel no longer renders the shortlist editor, while existing pitch/final-deliberation behavior remains available.
- [x] #4 Relevant tests are updated for the new placement and required validation passes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
L1 micro-brief: the closest analog is the existing operations tab composition in `app/pages/account/hackathons/[slug]/index.vue`, where the admin operations panel already owns lifecycle-centric controls and status. Main risk was leaving shortlist fetch state and lifecycle copy split between the primary operations surface and the secondary competition surface, which would keep admins bouncing between two mental models even after moving the editor.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Moved the shortlist editor into the primary admin Operations workflow by adding shortlist loading and shortlist actions to `AccountHackathonAdminOperationsPanel.vue` and rendering `AdminCompetitionShortlistPanel` directly in the lifecycle section during `shortlist`.

Removed shortlist rendering and shortlist-specific data/actions from `AccountHackathonCompetitionPanel.vue`, leaving the later pitch, final deliberation, outcomes, and redemptions surfaces intact.

Updated operations-facing copy and lifecycle helper messaging to reference Operations instead of the old Competition tab wording. Validation passed with `bun run lint`, `bun run typecheck`, and `bun run test:unit`.

Risk/follow-up: the pitch and later judging surfaces still live in `AccountHackathonCompetitionPanel.vue` under the Operations tab, so there is still a split between the primary lifecycle card and the lower competition workspace after shortlist. No dedicated browser test currently asserts the shortlist panel placement inside Operations.
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
