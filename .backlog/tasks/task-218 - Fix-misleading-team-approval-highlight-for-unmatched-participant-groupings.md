---
id: TASK-218
title: Fix misleading team approval highlight for unmatched participant groupings
status: Done
assignee:
  - '@codex'
created_date: '2026-04-14 17:40'
updated_date: '2026-04-14 17:42'
labels:
  - participants
  - ux
dependencies: []
documentation:
  - docs/domain-model.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Adjust the shared participant review UI used by the account-scoped hackathon admin Participants tab so a submitted participant grouped only with unmatched teammate hints does not visually appear to have used the team-wide approval action when the admin stages approval for that one participant.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 When a submitted participant is grouped only with unmatched teammate hints, staging approval for that participant keeps the single approve action visually selected.
- [x] #2 Inferred team groups with multiple matched applicants still present the team approval state when the full visible group is staged approved.
- [x] #3 Participant review staging behavior remains unchanged apart from the corrected selected-state feedback.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extract the approval-selected predicates from the shared participant review surface into `app/utils/admin-application-review.ts` so the UI and tests use one rule.
2. Treat team approval as visually selected only when an inferred group contains multiple visible applicants and all of them are staged approved; unmatched pending teammate hints alone should not trigger the team-selected state.
3. Update the participant review panel to use the shared predicates without changing the existing approve and approve-team actions.
4. Add unit coverage in `tests/unit/app/utils/admin-application-review.test.ts` for the unmatched-hint case and the matched multi-applicant case.
5. Run `bun run lint`, `bun run typecheck`, and `bun run test:unit` before handoff.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Discovery: the misleading highlight comes from `AdminApplicationsReviewPanel.vue` inferring team selection from `canApproveTeam(group)` plus all visible applicants being staged approved, which wrongly treats unmatched pending teammate hints as a full team approval.

Implemented shared approval-selection helpers in `app/utils/admin-application-review.ts` so inferred groups with only unmatched teammate hints keep the single-approve state selected instead of marking `Approve Team` as active.

Validation passed: `bun run lint`, `bun run typecheck`, and `bun run test:unit`. Canonical docs remain unchanged because this is a UI-state correction within the existing participant review behavior.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated the shared participant review approval-selection logic so a staged approval on a single applicant with unmatched teammate hints keeps the individual `Approve` action highlighted instead of implying a full team approval. Moved the selection predicates into `app/utils/admin-application-review.ts`, wired `AdminApplicationsReviewPanel.vue` to those helpers, and added unit coverage for both the unmatched-hint case and the matched multi-applicant case. Validation passed with `bun run lint`, `bun run typecheck`, and `bun run test:unit`. No canonical doc changes were required because the product behavior did not change beyond correcting misleading UI feedback. Risks/follow-up: none identified beyond optional browser verification in the participant review screen.
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
