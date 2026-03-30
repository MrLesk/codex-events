---
id: TASK-115.1
title: Restrict non-member participant access to team member data
status: Done
assignee: []
created_date: '2026-03-30 15:59'
updated_date: '2026-03-30 18:10'
labels:
  - security
  - privacy
  - api
dependencies: []
references:
  - 'server/api/hackathons/[hackathonId]/teams/[teamId]/index.get.ts'
  - server/utils/team-formation.ts
  - app/components/teams/ParticipantTeamMembershipPanel.vue
  - app/utils/team-workspace.ts
documentation:
  - docs/security-analysis.md
parent_task_id: TASK-115
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fix the team-detail privacy leak identified in `docs/security-analysis.md`. Team members should continue to see the contact and profile data needed to collaborate within their own team. Approved participants who are not members of a team must not receive that team’s member personal contact details or external-account identifiers through participant-visible team APIs.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Approved participants who are not members of a team cannot access that team’s member email addresses, social profile URLs, ChatGPT email, OpenAI org ID, or Luma username through participant-visible team APIs
- [x] #2 Members of a team retain the team-member data they need for legitimate team collaboration and management workflows
- [x] #3 Hackathon admins retain the visibility they need for legitimate administrative workflows
- [x] #4 Participant-facing team UI continues to work with the revised participant-visible and member-visible response shapes
- [x] #5 Automated tests cover non-member redaction, member access, and admin access
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Keep `requireTeamVisibilityContext()` as the route access gate for team discovery during team formation.
2. In `server/api/hackathons/[hackathonId]/teams/[teamId]/index.get.ts`, resolve whether the actor is a member of the specific target team and use that, together with hackathon-admin access, to decide whether full or redacted member data is returned.
3. In `server/utils/team-formation.ts`, make team-member serialization authorization-aware so non-members receive only stable member identity fields while members and hackathon admins retain full contact/profile fields.
4. In `app/utils/team-workspace.ts` and `app/components/teams/ParticipantTeamMembershipPanel.vue`, treat member contact fields as optional and render the team-membership panel cleanly when email is omitted.
5. Add and update tests for non-member redaction, target-team member full access, and hackathon-admin full access, then run targeted validation followed by `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-03-30: implemented team-detail redaction for approved non-members while preserving full member data for same-team members and hackathon admins. Updated the participant team member panel to render cleanly when email is omitted, and added serializer unit coverage plus team-detail integration coverage for outsider/member/admin visibility.

Validation: `bun run typecheck` passed, `bun run test:unit` passed, and `bun run test:integration -- tests/integration/server/api/team-formation-routes.test.ts` passed. `bun run lint` is currently failing due unrelated existing issues in `server/middleware/local-d1-binding.ts`, `tests/support/backend/api-route.ts`, and `tests/unit/server/routes/auth/account-linking.test.ts`.

2026-03-30: implementation plan approved. Full member visibility will be preserved for target-team members and hackathon admins, while unrelated approved participants will receive a redacted team-member shape on team detail.

2026-03-30: revalidated TASK-115.1 after plan approval. Targeted checks passed with `bun run test:unit -- tests/unit/server/utils/team-formation.test.ts` and `bun run test:integration -- tests/integration/server/api/team-formation-routes.test.ts`. Broader checks: `bun run typecheck` passed and `bun run test:unit` passed. `bun run lint` still fails for unrelated existing issues in `server/middleware/local-d1-binding.ts`, `tests/support/backend/api-route.ts`, and `tests/unit/server/routes/auth/account-linking.test.ts`.
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
