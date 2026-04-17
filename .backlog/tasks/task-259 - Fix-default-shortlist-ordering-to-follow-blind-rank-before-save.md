---
id: TASK-259
title: Fix default shortlist ordering to follow blind rank before save
status: Done
assignee:
  - '@codex'
created_date: '2026-04-17 19:33'
updated_date: '2026-04-17 19:34'
labels:
  - judging
  - admin
  - bug
dependencies: []
references:
  - app/components/admin/AdminCompetitionShortlistPanel.vue
  - server/utils/shortlist.ts
  - >-
    http://localhost:3000/account/hackathons/codex-vienna-2026-04-18-registration-today?tab=operations
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The unsaved shortlist view can display ranked submissions in the wrong order because the blind leaderboard path reuses competition entries after a later final-score pass reorders unranked entries alphabetically. This causes the default shortlist boundary to show lower-scoring submissions above higher-scoring ones before any shortlist save. Fix the blind leaderboard ordering so shortlist defaults and blind leaderboard views follow blind rank consistently.
<!-- SECTION:DESCRIPTION:END -->

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

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Default shortlist ordering follows blind rank when no shortlist has been saved yet, even when team-name order differs from blind-score order.
- [x] #2 Blind leaderboard consumers keep ranked entries ordered by blind rank and leave unranked entries after them.
- [x] #3 Regression coverage proves the derived shortlist order does not fall back to team-name ordering.
- [x] #4 Relevant validation passes for the shortlist ordering fix.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Root cause: the blind leaderboard path reused competition entries after the later final-score ranking pass, which reordered every entry alphabetically by team name when no final scores existed yet. The default shortlist then inherited that alphabetical order instead of blind rank.

Fix: `toBlindLeaderboardEntries` now explicitly orders ranked entries by `blindRank` and appends unranked entries alphabetically. Added an integration regression test that renames the lower-scoring team to sort first alphabetically and verifies the derived shortlist still follows blind score.

Validation: `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bun run test:integration` all passed locally.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed the default shortlist ordering bug that could place a lower-scoring submission above a higher-scoring one before any shortlist save. The issue was in the blind leaderboard path: after blind ranks were assigned, a later final-score pass reordered entries alphabetically by team name when no final scores existed yet, and the unsaved shortlist default inherited that incorrect order.

The fix makes the blind leaderboard path explicitly order ranked entries by `blindRank` and only append unranked entries afterward. That restores the correct blind-score ordering for the default shortlist view and for other blind leaderboard consumers without changing saved shortlist behavior.

Added a regression integration test that forces a mismatch between alphabetical team-name order and blind-score order, then verifies the derived shortlist still follows blind rank. Validation passed locally with `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bun run test:integration`.
<!-- SECTION:FINAL_SUMMARY:END -->
