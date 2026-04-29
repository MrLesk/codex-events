---
id: TASK-303.14
title: Move bounded client domain utilities out of app utils
status: Done
assignee: []
created_date: '2026-04-29 18:08'
updated_date: '2026-04-29 18:10'
labels:
  - architecture
  - client
  - refactor
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
modified_files:
  - app/domains/credits/index.ts
  - app/domains/hackathons/participation.ts
  - app/domains/hackathons/published-roster.ts
  - app/domains/hackathons/role-roster.ts
  - app/domains/judging/workspace.ts
  - app/domains/prize-redemptions/index.ts
  - app/domains/submissions/team-submission.ts
  - app/domains/teams/workspace.ts
  - app/components/account/hackathons/AccountHackathonAdminOperationsPanel.vue
  - app/components/account/hackathons/AccountHackathonCreditsPanel.vue
  - app/components/account/hackathons/AccountHackathonJudgePanel.vue
  - >-
    app/components/account/hackathons/AccountHackathonParticipantSubmissionPanel.vue
  - app/components/account/hackathons/AccountHackathonParticipantTeamPanel.vue
  - >-
    app/components/account/hackathons/AccountHackathonParticipantWorkspacePanel.vue
  - >-
    app/components/account/hackathons/AccountHackathonParticipationRankNotice.vue
  - app/components/account/hackathons/AccountHackathonPublishedRosterPanel.vue
  - app/components/account/hackathons/AccountHackathonRoleRosterPanel.vue
  - app/components/admin/AdminCompetitionPrizeRedemptionsPanel.vue
  - app/components/hackathons/HackathonParticipationCard.vue
  - app/components/judging/BlindSubmissionPanel.vue
  - app/components/judging/JudgeAssignmentInboxCard.vue
  - app/components/judging/JudgeAssignmentStatusBadge.vue
  - app/components/judging/JudgeAssignmentWorkspacePanel.vue
  - app/components/judging/JudgeReviewRubric.vue
  - app/components/judging/PitchSubmissionPanel.vue
  - app/components/public/hackathons/HackathonPublishedProjectsShowcase.vue
  - app/components/public/hackathons/HackathonWinnersShowcase.vue
  - app/components/teams/ParticipantTeamDirectoryPanel.vue
  - app/components/teams/ParticipantTeamJoinRequestsPanel.vue
  - app/components/teams/ParticipantTeamMembershipPanel.vue
  - app/components/teams/ParticipantTeamSubmissionPanel.vue
  - app/components/teams/ParticipantTeamWorkspacePanel.vue
  - app/composables/useHackathonParticipationWorkspace.ts
  - app/composables/useJudgeWorkspace.ts
  - app/composables/usePrizeRedemptionWorkspace.ts
  - app/composables/useTeamFormationWorkspace.ts
  - app/composables/useTeamSubmissionWorkspace.ts
  - 'app/pages/account/hackathons/[slug]/index.vue'
  - app/pages/account/judging.vue
  - app/pages/prize-redemptions/index.vue
  - tests/unit/app/domains/credits/index.test.ts
  - tests/unit/app/domains/hackathons/participation.test.ts
  - tests/unit/app/domains/hackathons/published-roster.test.ts
  - tests/unit/app/domains/hackathons/role-roster.test.ts
  - tests/unit/app/domains/judging/workspace.test.ts
  - tests/unit/app/domains/prize-redemptions/index.test.ts
  - tests/unit/app/domains/submissions/team-submission.test.ts
  - tests/unit/app/domains/teams/workspace.test.ts
  - tests/unit/app/composables/useTeamFormationWorkspace.test.ts
  - tests/unit/app/composables/useTeamSubmissionWorkspace.test.ts
parent_task_id: TASK-303
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Move bounded client-side domain helper modules out of app/utils into app/domains so app/utils is reserved for cross-cutting presentation and framework utilities. Cover hackathon participation, rosters, credits, judging workspace helpers, prize redemptions, team submission, and team workspace helpers without compatibility re-exports.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Hackathon participation and roster helpers live under app/domains/hackathons and callers import them from those paths directly.
- [x] #2 Hackathon credits and prize redemption helpers live under explicit app domain paths and callers import them from those paths directly.
- [x] #3 Judging, team submission, and team workspace helpers live under their matching app domain paths and callers import them from those paths directly.
- [x] #4 Moved helper tests live under tests/unit/app/domains and no compatibility re-exports remain in app/utils for moved modules.
- [x] #5 Required validation passes: bun run lint, bun run typecheck, and bun run test:unit.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Moved bounded client domain helpers from app/utils into app/domains: credits, hackathon participation, published rosters, role rosters, judging workspace helpers, prize redemptions, team submission, and team workspace helpers. Updated components, composables, pages, and unit tests to import the new domain paths directly with no compatibility re-exports. Canonical product docs are unchanged because this is an internal module-boundary refactor. Validation passed: moved helper/composable focused tests, bun run lint, bun run typecheck, and bun run test:unit.
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
