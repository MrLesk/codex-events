---
id: TASK-209
title: >-
  Fix configurable judging review regressions in judge uniqueness and moderation
  flows
status: Done
assignee:
  - '@Codex'
created_date: '2026-04-13 16:12'
updated_date: '2026-04-13 16:26'
labels:
  - judging
  - review-fix
  - regression
dependencies: []
references:
  - TASK-205
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/api-surface.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Address the review findings against the configurable judging rollout so the runtime again matches the canonical docs. The fix must enforce distinct judges across two-slot blind review assignment generation and reassignment, align admin submission moderation state guards with the blind_review / pitch_review / final_deliberation lifecycle, and keep persisted shortlist/final-deliberation ordering valid after legitimate disqualifications so admins can continue operating the hackathon.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Two-slot blind review cannot generate or reassign duplicate judges onto the same submission and returns a clear conflict when the automatic judge pool cannot satisfy the invariant
- [x] #2 Submission disqualification and assignment ineligibility reversal are accepted in the judging lifecycle states exposed by the admin UI
- [x] #3 Disqualifying a ranked or finalist submission during judging keeps shortlist pitch-start and final-deliberation views operable by removing stale persisted ordering references
- [x] #4 Unit and integration regressions cover the review findings and local validation passes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Tighten blind-review invariants in `server/utils/judging.ts` so two-slot blind review requires two distinct automatic judges at preparation/assignment time and skip/reassign flows reject duplicate reassignment onto the same submission.
2. Align moderation lifecycle guards in `server/utils/submissions.ts` and `server/api/hackathons/[hackathonId]/judging/assignments/[assignmentId]/actions/revert-ineligibility.post.ts` with the admin UI states for blind review, shortlist, pitch review, final deliberation, winners announced, and completed.
3. Keep persisted ordering valid after disqualification by pruning stale finalist and final-ranking submission IDs when a locked submission is disqualified, and cover the shortlist/pitch/final-deliberation read paths with regressions.
4. Update the closest unit and integration tests for judging, submissions, shortlist, hackathon routes, and judging routes, then run targeted validation followed by repo gates before finalizing the task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-04-13: Review feedback identified five concrete regressions in the configurable judging rollout. User instructed me to take decisions and continue to completion, so I am treating that as approval to execute the recorded plan without an intermediate review stop.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed the review regressions in the configurable judging rollout. Two-slot blind review now requires enough distinct automatic judges up front and skip/reassign flows reject replacements that would duplicate the blind-review judge on the same submission. Backend moderation guards now match the admin UI lifecycle for submission disqualification and assignment ineligibility reversal across blind review, shortlist, pitch review, final deliberation, winners announced, and completed. Disqualifying a locked submission now prunes any stored pitch-finalist and final-ranking references at write time so shortlist, pitch-start, and final-deliberation views remain operable without read-time fallback behavior. Regression coverage was added in unit and integration tests for the review cases. Canonical docs were confirmed unchanged. Validation passed with `git diff --check`, `bun run lint`, `bun run typecheck`, `bun run test:unit`, `bun run test:integration`, and `bun run test:bdd`. No follow-up gap remains from the reported review findings.
<!-- SECTION:FINAL_SUMMARY:END -->

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
