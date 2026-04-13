---
id: TASK-205.2.4.3
title: Refactor winners backend for final deliberation flow
status: Done
assignee: []
created_date: '2026-04-13 07:04'
updated_date: '2026-04-13 08:56'
labels:
  - judging
  - backend
dependencies:
  - TASK-205.2.4.2
references:
  - docs/domain-model.md
  - docs/api-surface.md
  - docs/lifecycle-and-state-machines.md
parent_task_id: TASK-205.2.4
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update winner announcement guards and winners data to use final-deliberation ordering and scoring outputs for the supported judging configurations.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Winner announcement is allowed only from final_deliberation and uses final ranking data.
- [x] #2 Winners and prize redemption behavior use the final ranking output rather than shortlist reorder semantics.
- [x] #3 Targeted backend tests cover winner announcement and winner reads for the configurable judging model.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Supervisor review: validated that `server/utils/shortlist.ts` now derives winners from final-deliberation ordering rather than shortlist ordering, with `assertWinnersAnnouncementAllowed(...)` enforcing `final_deliberation` and `getWinnersView(...)` applying any persisted `finalRankingSubmissionIdsJson` override before prize mapping. `server/api/hackathons/[hackathonId]/actions/announce-winners.post.ts` and `server/utils/prize-redemptions.ts` inherit the new behavior through the shared shortlist helpers without requiring direct contract changes.

Validation passed with `bun x vitest run tests/unit/server/utils/shortlist.test.ts` and `bun x vitest run --config vitest.integration.config.ts tests/integration/server/api/outcome-routes.test.ts`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Winner announcement now starts only from `final_deliberation`, and published winners/prize redemptions are derived from the final-deliberation ordering rather than the old shortlist ordering.

The backend also preserves persisted final-ranking overrides through announcement and public winners reads, with targeted unit and integration outcome tests passing locally.
<!-- SECTION:FINAL_SUMMARY:END -->

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
