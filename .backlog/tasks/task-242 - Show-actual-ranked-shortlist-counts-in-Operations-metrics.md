---
id: TASK-242
title: Show actual ranked shortlist counts in Operations metrics
status: Done
assignee:
  - '@codex'
created_date: '2026-04-17 13:48'
updated_date: '2026-04-17 13:49'
labels:
  - judging
  - admin
  - frontend
dependencies: []
documentation:
  - app/components/account/hackathons/AccountHackathonAdminOperationsPanel.vue
  - server/utils/shortlist.ts
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fix the Operations shortlist-state metric cards so they reflect the actual ranked shortlist count instead of the number of locked submissions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 During `shortlist`, the `Blind-Ranked Submissions` metric reflects the count of ranked blind-review entries rather than the count of locked submissions.
- [x] #2 The changed metrics remain consistent with the shortlist API behavior when no submissions are ranked yet.
- [x] #3 Required validation passes for the changed area.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
L1 micro-brief: the Operations shortlist card was using `lockedSubmissionCount`, but the shortlist API and UI operate on ranked entries only. The native fix was to derive a local `rankedBlindSubmissionCount` from the already-loaded leaderboard and use that value for the `Blind-Ranked Submissions` metric during `shortlist`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated `AccountHackathonAdminOperationsPanel.vue` so the `Blind-Ranked Submissions` metric uses the count of leaderboard entries with a non-null blind rank instead of the count of locked submissions.

This makes the Operations numbers match the shortlist API behavior for hackathons where submissions are locked but no blind-review scores have produced ranked shortlist entries yet.

Validation passed with `bun run lint`, `bun run typecheck`, and `bun run test:unit`. Test gap: there is no dedicated component-level test for this specific metric card; coverage here relies on the existing unit/type/lint surfaces.
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
