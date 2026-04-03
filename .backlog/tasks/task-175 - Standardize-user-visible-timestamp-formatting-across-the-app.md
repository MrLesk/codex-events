---
id: TASK-175
title: Standardize user-visible timestamp formatting across the app
status: Done
assignee:
  - Codex
created_date: '2026-04-03 20:25'
updated_date: '2026-04-03 20:28'
labels: []
dependencies: []
references:
  - app/components/teams/ParticipantTeamWorkspacePanel.vue
  - app/components/teams/ParticipantTeamMembershipPanel.vue
  - app/components/teams/ParticipantTeamJoinRequestsPanel.vue
  - app/components/teams/ParticipantTeamSubmissionPanel.vue
  - app/components/admin/AdminTeamsOperationsPanel.vue
  - app/components/judging/BlindSubmissionPanel.vue
  - app/components/judging/JudgeAssignmentInboxCard.vue
  - 'app/pages/hackathons/[slug]/judging/assignments/[assignmentId].vue'
  - app/components/public/hackathons/HackathonTimeline.vue
  - app/components/public/hackathons/HackathonAgendaPanel.vue
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace raw ISO timestamp displays in the website with a shared Intl-based presentation and align existing user-visible timestamp surfaces to the same display style so participants, judges, and admins do not see unformatted backend timestamps.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 User-visible timestamp fields no longer render raw ISO values anywhere in the identified website surfaces.
- [x] #2 A shared Intl-based timestamp formatter is used for participant, admin, and judging timestamp displays so the app presents one consistent date-time style.
- [x] #3 Existing public hackathon timeline and agenda time displays remain human-readable and consistent with the new timestamp style.
- [x] #4 Automated tests cover the shared formatter behavior and any changed helper output that drives visible timestamp labels.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a shared app-level Intl timestamp formatter for operational event timestamps.
2. Route judge timestamp formatting through that shared utility so judging surfaces keep their existing wording while matching the common display style.
3. Replace raw ISO timestamp renders in participant team, join-request, submission, admin team-monitor, and prize-redemption surfaces.
4. Add unit coverage for the shared formatter and the judge timestamp wrapper, then run `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented `app/utils/date-formatting.ts` with a shared Intl timestamp formatter and switched judge timestamp formatting to use it.

Replaced raw ISO timestamp renders in participant team workspace, team membership, join requests, team submission, and admin team-monitor cards with the shared formatter.

Normalized the raw winner-terms published timestamp in prize redemptions to the existing date-only hackathon formatter so terms metadata no longer leaks raw backend timestamps.

Validation passed: `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Standardized user-visible timestamp formatting across the website by adding a shared Intl-based formatter in `app/utils/date-formatting.ts` and routing judge timestamp rendering through it. Participant team workspace, team membership, join requests, team submission, and admin team-monitor surfaces now show human-readable timestamps instead of raw ISO strings.

I also normalized the winner-terms published timestamp in the prize redemption flow to the existing date formatter so terms metadata stays consistent with the rest of the product.

Tests added or updated: unit coverage for the shared formatter and the judge timestamp wrapper. Validation passed with `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
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
