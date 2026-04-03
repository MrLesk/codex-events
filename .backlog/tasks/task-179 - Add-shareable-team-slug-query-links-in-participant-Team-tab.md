---
id: TASK-179
title: Add shareable team slug query links in participant Team tab
status: In Progress
assignee: []
created_date: '2026-04-03 21:24'
updated_date: '2026-04-03 21:34'
labels:
  - ui
  - participant-experience
  - routing
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Let the account-scoped participant Team tab accept `?tab=team&team={slug}` so approved users can share a direct link to a specific team. The selected team should open even when the viewer already belongs to another team, but only the public participant-facing team summary/join surface should appear for non-members. Team members should get a clear way to return to their own team view.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The Team tab accepts a `team` query slug and resolves the selected team reliably from the current hackathon.
- [ ] #2 When the viewer opens another team's shared link, the Team tab shows that selected team instead of forcing the viewer back to their own team.
- [ ] #3 Non-members viewing another team through a shared link do not see team submission, member roster, or join-request management surfaces.
- [ ] #4 If the viewer already belongs to a team and is viewing another team, the Team tab shows a clear `Back to my team` action.
- [ ] #5 Participant team links and buttons use the shareable `?tab=team&team={slug}` URL pattern.
- [ ] #6 Relevant tests cover slug selection and visibility behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Accept a `team` slug query on the account Team tab and normalize it through a dedicated route helper.
2. Resolve that slug to the canonical team ID through the existing team list API using exact slug filtering.
3. Update the participant Team panel so selected-team links can override the default own-team view, while non-members only see the public summary/join surface and team-specific navigation actions.
4. Add helper and API coverage for the shareable team-link behavior, then run validation.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented a dedicated `team` query helper and threaded a normalized selected team slug from the account hackathon page into the participant Team panel.

The Team panel now resolves shared team slugs through the existing team list route, supports viewing another team without forcing the viewer back to their own team, shows a `Back to my team` action for team members, and hides submission/member-roster/join-request panels for non-members.

Participant team directory links now use the shareable `?tab=team&team={slug}` URL pattern, and the overview Team CTA prefers the viewer's own active team slug when available so their own team URL is shareable too.

Direct validation for this task passed: `bun run lint`, `bunx vitest run tests/unit/app/utils/team-query.test.ts tests/unit/app/utils/team-submission.test.ts`, and `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/team-formation-routes.test.ts`.

Global `bun run typecheck` and `bun run test:unit` are currently blocked by concurrent unrelated edits around the `admins` tab (`app/utils/account-hackathon-tabs.ts`, `app/utils/account-hackathon-seo.ts`, and the corresponding unit tests). Per user instruction, those unrelated changes were left untouched.
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
