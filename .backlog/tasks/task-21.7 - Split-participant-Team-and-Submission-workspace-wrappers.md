---
id: TASK-21.7
title: Split participant Team and Submission workspace wrappers
status: Done
assignee:
  - '@codex'
created_date: '2026-04-12 12:44'
updated_date: '2026-04-12 12:48'
labels:
  - participant
  - account-workspace
  - submission
  - ui
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/permissions-matrix.md
parent_task_id: TASK-21
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refactor the participant account hackathon workspace so the Team tab and Submission tab no longer share the same top-level wrapper component. The existing `AccountHackathonParticipantTeamPanel` currently branches on a `section` prop to render either team-management UI or submission-management UI, which has already started leaking team-only content into the Submission tab. Introduce a dedicated participant Submission wrapper component, keep the Team wrapper focused on team formation and team directory concerns, and remove the remaining submission summary card from the participant submission form so the surface stays lean and non-redundant.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The participant Team tab uses a dedicated team wrapper component with no `section` prop or submission-branch rendering.
- [x] #2 The participant Submission tab uses a dedicated submission wrapper component that preserves the existing participant submission behavior and closed-window card.
- [x] #3 The participant submission form no longer renders the separate submission summary card.
- [x] #4 Existing participant team-directory content only appears on the Team tab.
- [x] #5 Required validation commands pass after the refactor.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create a dedicated participant submission wrapper component that owns submission-only state, the registration-phase closed-window card, and the existing `ParticipantTeamSubmissionPanel` wiring.
2. Refactor `AccountHackathonParticipantTeamPanel.vue` to remove the `section` prop and all submission-specific branching so it only handles team workspace and team directory concerns.
3. Update `app/pages/account/hackathons/[slug]/index.vue` to render separate top-level participant Team and Submission components.
4. Remove the submission summary card from `ParticipantTeamSubmissionPanel.vue` while keeping the remaining submission status metadata and form behavior intact.
5. Run `bun run lint`, `bun run typecheck`, and `bun run test:unit`, then record any remaining test gap in the task summary.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-04-12: User requested that Team and Submission stop sharing the same top-level wrapper component. They also want the separate submission summary card removed from the participant submission form because it repeats information unnecessarily.

2026-04-12: Split the participant workspace wrappers so `AccountHackathonParticipantTeamPanel.vue` is team-only and a new `AccountHackathonParticipantSubmissionPanel.vue` owns the submission-only surface, closed-window card, and submission actions.

2026-04-12: Removed the separate submission summary card from `ParticipantTeamSubmissionPanel.vue`. No focused test updates were required because the refactor preserved the existing participant submission test ids and route-level behavior while simplifying duplicate presentation.

2026-04-12: Validation run: `bun run lint`, `bun run typecheck`, and `bun run test:unit` all passed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Separated the participant account hackathon Team and Submission tabs into distinct top-level components so the Team tab no longer branches on a `section` prop to render submission UI. `AccountHackathonParticipantTeamPanel.vue` now owns only team workspace and directory concerns, while the new `AccountHackathonParticipantSubmissionPanel.vue` owns the participant submission workspace, including the registration-phase closed-window card and the existing submission actions.

Removed the standalone submission summary card from `ParticipantTeamSubmissionPanel.vue` so the submission surface no longer repeats the same explanation in a separate box. The remaining submission metadata and form behavior are unchanged, and the account hackathon page now renders the dedicated Submission wrapper directly.

Validation run:
- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`

Test scope note:
- No focused test updates were needed because the refactor preserved existing participant submission test ids and route behavior while simplifying duplicate presentation.
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
