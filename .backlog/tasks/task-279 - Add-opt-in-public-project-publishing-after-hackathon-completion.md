---
id: TASK-279
title: Add opt-in public project publishing after hackathon completion
status: Done
assignee:
  - codex
created_date: '2026-04-19 16:19'
updated_date: '2026-04-19 16:39'
labels: []
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/schema-outline.md
  - docs/lifecycle-and-state-machines.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Allow teams to choose whether their completed hackathon project is displayed publicly after the hackathon ends, and surface those opted-in projects in the completed winners experience without confusing them with actual winners.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 After a hackathon reaches completed, a team admin can toggle public visibility for that team's eligible project from the account hackathon workspace.
- [x] #2 The publish toggle is not offered before completion and does not appear when the team has no eligible project to publish.
- [x] #3 The completed winners surface keeps winner projects in a distinct winner section and shows opted-in non-winning published projects in a clearly separated secondary section.
- [x] #4 Public and account-scoped outcome reads expose published project details only for completed hackathons and only for teams that opted in.
- [x] #5 Canonical docs and automated tests are updated to cover the new publication behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a canonical submission-level boolean for post-completion public project publishing, with schema and migration updates plus serializer/type propagation through submission and participation payloads.
2. Add a dedicated completion-only participant API for team admins to toggle public project visibility without reopening normal submission editing.
3. Extend the participant workspace submission area to show the new toggle only when the hackathon is completed and the team has an eligible non-winning locked project.
4. Extend completed outcome reads to return winner entries unchanged plus a separate list of opted-in published non-winner projects including published team-member profiles.
5. Update the completed public/account winners UI to render the existing winners section first and a clearly separate secondary card below it for published projects.
6. Update canonical docs and add or adjust unit/integration coverage for schema, API, eligibility rules, and completed showcase rendering.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Discovery brief: this is an L2 change spanning canonical docs, submission schema/API serialization, participant workspace, and both public/account completed winners views.

Analogous implementations reviewed: team join-policy toggle in participant workspace, submission serialization and preload flows, and winners serialization in server/utils/shortlist.ts.

Main modeling decision from discovery: the public-visibility flag should live on Submission rather than Team because the published artifact is the project submission and the completed winners view is already submission-based.

Validated the shipped behavior with the required repo commands plus targeted integration coverage for the new completion-only publication flow.

UI copy and placement were aligned to the clarified product direction: keep published projects visually close to winners, but render them in a separate card below the winners section to avoid confusion.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a submission-level `isPubliclyVisible` flag plus migration, serializers, and a completion-only team-admin toggle endpoint so eligible locked non-winning submissions can be published after a hackathon is completed. Updated the participant workspace to expose the toggle only when the project is eligible, and extended completed outcome reads so public and account hackathon pages render a separate published-projects card below winners using the same project/member presentation style, including member profiles. Canonical docs were updated to describe the completed outcome showcase and publication rules. Validation: `bun run lint` passed with one pre-existing `vue/no-v-html` warning in `app/components/admin/AdminCompetitionPrizeRedemptionsPanel.vue`, `bun run typecheck` passed, `bun run test:unit` passed, and targeted integration coverage passed for migration, submission visibility routes, and completed outcome reads. Risks/follow-up: winner teams are intentionally excluded from the publish toggle and continue to appear only in the winners section; no config or workflow-doc changes were required because setup was unchanged.
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
