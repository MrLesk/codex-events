---
id: TASK-205.2.4.2
title: Implement final deliberation weighted scoring backend
status: Done
assignee:
  - Codex
created_date: '2026-04-13 07:04'
updated_date: '2026-04-13 07:33'
labels:
  - judging
  - backend
dependencies:
  - TASK-205.2.4.1
references:
  - docs/domain-model.md
  - docs/api-surface.md
  - docs/lifecycle-and-state-machines.md
parent_task_id: TASK-205.2.4
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add final-deliberation reads and ranking override persistence using configurable blind and pitch weights across blind-only, pitch-only, and combined hackathons.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Final score calculation supports blind-only, pitch-only, and combined hackathons with the configured blind/pitch weights.
- [x] #2 `GET /api/hackathons/:hackathonId/final-deliberation` returns the final scoreboard and any persisted final ranking override.
- [x] #3 `POST /api/hackathons/:hackathonId/final-deliberation/actions/reorder` persists the final ranking override without mutating underlying scores, with targeted backend test coverage.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add `finalRankingSubmissionIdsJson` to the runtime hackathon schema and add the next SQL migration plus schema/migration coverage.
2. Refactor `server/utils/shortlist.ts` so one derived-scoring path computes blind score, pitch score, weighted final score, and ranked/unranked entries for blind-only, pitch-only, and combined hackathons.
3. Add `POST /api/hackathons/:hackathonId/actions/start-final-deliberation`, `GET /api/hackathons/:hackathonId/final-deliberation`, and `POST /api/hackathons/:hackathonId/final-deliberation/actions/reorder` using the existing shortlist action/list auth and audit patterns.
4. Update leaderboard behavior only where required so pitch-review and final-deliberation reads expose the correct stage-aware overall score without changing winner announcement semantics.
5. Add targeted unit and integration tests for weighted scoring, final-deliberation guards, ranking override persistence, and the new migration field.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Scoped as the final-deliberation backend slice: add final ranking override storage, implement start-final-deliberation plus final-deliberation read/reorder routes, and compute configurable blind/pitch final scores without changing winner announcement flow yet.

Added final ranking override storage on hackathons, implemented `start-final-deliberation` plus final-deliberation read/reorder routes, and introduced configurable blind/pitch final score calculation for blind-only, pitch-only, and combined hackathons while leaving winner announcement flow for the next task.
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
