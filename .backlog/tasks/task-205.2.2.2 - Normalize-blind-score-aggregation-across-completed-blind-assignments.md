---
id: TASK-205.2.2.2
title: Normalize blind score aggregation across completed blind assignments
status: Done
assignee:
  - Codex
created_date: '2026-04-13 06:19'
updated_date: '2026-04-13 06:40'
labels:
  - judging
  - backend
dependencies:
  - TASK-205.2.2.1
references:
  - docs/domain-model.md
parent_task_id: TASK-205.2.2
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update blind-review scoring utilities so completed blind assignments aggregate on the documented normalized 0..10 model instead of assuming a single raw weighted score per submission.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Blind assignment totals are normalized to the documented 0..10 scale.
- [x] #2 Blind leaderboard/outcome utilities average completed blind assignments per submission rather than assuming one assignment.
- [x] #3 Targeted backend tests cover normalized blind score aggregation across multiple completed blind reviews.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update `server/utils/shortlist.ts` so each completed blind assignment computes a normalized 0..10 score from criterion scores and criterion weights, then average completed blind assignments per submission for leaderboard ranking.
2. Preserve the existing leaderboard/shortlist serialization shape while replacing the single latest-assignment assumption with completed blind-assignment aggregation.
3. Update only the targeted shortlist unit and outcome-route tests for normalized multi-assignment blind scoring and any directly-related `blind_review` lifecycle literals in this slice.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Reviewed AGENT-SPAWN-NOTES, docs/README.md, judging/scoring rules in docs/domain-model.md, backlog overview/task-execution guidance, and TASK-205.2.2.2 before implementation.

Implemented normalized 0..10 blind assignment scoring in shortlist utilities, averaged completed blind reviews per submission, aligned shortlist lifecycle guard to blind_review, and updated unit/integration coverage for multi-review leaderboard aggregation.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Canonical docs were updated or confirmed unchanged
- [ ] #2 Code behavior matches canonical docs
- [ ] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [ ] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [ ] #7 Auth and permissions changes follow the documented platform model
- [ ] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
