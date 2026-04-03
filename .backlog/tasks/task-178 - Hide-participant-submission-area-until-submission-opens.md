---
id: TASK-178
title: Hide participant submission area until submission opens
status: Done
assignee: []
created_date: '2026-04-03 21:09'
updated_date: '2026-04-03 21:13'
labels:
  - ui
  - participant-experience
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Hide the participant Team tab submission area until the hackathon submission window opens so approved participants only see team formation content before submissions start.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The participant Team tab does not render the project submission area before the hackathon submission window opens
- [x] #2 The project submission area appears once the submission window opens for participants who can access the Team tab
- [x] #3 Existing participant team workspace content continues to render correctly before and after submission opens
- [x] #4 Relevant tests cover the gating behavior
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Gate participant submission workspace visibility on hackathon submission phase plus active team membership.
2. Reuse that visibility rule for both Team tab rendering and submission workspace loading.
3. Add unit coverage for the visibility helper and validate with lint, typecheck, and unit tests.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Hid the participant submission area before submission_open by gating Team tab visibility through a shared submission helper instead of template-only branching.

Because the submission composable already resets when canViewSubmission is false, the same gate also prevents unnecessary pre-submission submission fetches.

Adjusted the interim loading copy to avoid mentioning submission status before the submission area is available.

Validated with bun run lint, bun run typecheck, and bun run test:unit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Gated the participant Team tab submission workspace so it only appears after the hackathon reaches submission_open and the viewer is an active team member. Added a shared `shouldShowParticipantSubmissionWorkspace` helper in `app/utils/team-submission.ts`, used it in `app/components/account/hackathons/AccountHackathonParticipantTeamPanel.vue` to control both panel rendering and submission workspace access, and updated the loading copy so registration-phase team views no longer mention submission status. Added unit coverage in `tests/unit/app/utils/team-submission.test.ts` for the visibility rule. Validation passed with `bun run lint`, `bun run typecheck`, and `bun run test:unit`.

Follow-up note: team slugs are still displayed in the participant team UI even though creation is now server-derived; if we want them fully removed from participant-facing UX, that should be a separate cleanup across the team directory and team workspace panels.
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
- [x] #9 If any participant-facing empty state or phase copy changes, the task summary records it
<!-- DOD:END -->
