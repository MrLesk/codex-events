---
id: TASK-153
title: Move participant team management into the account hackathon Team tab
status: Done
assignee:
  - codex
created_date: '2026-04-02 06:06'
updated_date: '2026-04-02 06:22'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create a participant-facing Team tab in the account hackathon workspace and refactor the approved-user team UI around it. The account overview currently shows old team/submission cards once submission starts, and participant team actions still live on separate /hackathons/:slug/teams routes. The goal is to make the account hackathon workspace the canonical participant surface for creating or joining a team, managing membership, reviewing join requests, and continuing submission work, using the modern semi-transparent shadcn-style panels already used in overview, prizes, details, judges, and related account pages. The user explicitly wants no fallback-based duplicate UI path and wants solo participation to remain represented as a team.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The account hackathon workspace exposes a participant-facing Team tab for participant team work without regressing the existing staff/admin Teams visibility tab behavior.
- [x] #2 The overview for approved users in or after submission phase is refactored to use the new participant team summary/action model and correctly reflects that solo participation is still represented as a team.
- [x] #3 The participant Team tab supports the current team formation and management actions allowed by canonical rules: create or join when eligible, leave when allowed, and approve or reject join requests when the user is a team admin.
- [x] #4 The participant team UI in the account workspace uses the modern semi-transparent shadcn-style card treatment instead of the older standalone team-page presentation.
- [x] #5 Participant team navigation and tests are updated so the account hackathon Team tab is the canonical participant team-management surface, with no compatibility fallback UI kept alongside it.
- [x] #6 Canonical docs are confirmed unchanged or updated if implementation reveals a mismatch, and relevant tests are updated for the changed behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a participant-facing `team` tab to the account hackathon workspace and wire tab access, labels, SEO copy, and shell-navigation handling while preserving the existing staff/admin `teams` visibility tab.
2. Build the canonical participant team workspace inside the account hackathon page by composing the existing team-formation and team-detail flows there, and refactor the overview summary cards so approved users are directed into the new Team tab while solo participation still reads as a team.
3. Update participant-facing team CTAs and route targets so the account workspace becomes the canonical participant team-management surface, and remove duplicate participant UI behavior rather than keeping compatibility fallbacks.
4. Restyle the participant team panels to use the modern semi-transparent account-workspace card treatment and align copy and hierarchy with the current account pages.
5. Update unit and BDD coverage for tab access, SEO, navigation, and participant team flows, then run `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Context discovery completed before implementation. Relevant areas reviewed: account hackathon workspace tabs/page, participant team routes and shared team panels, team workspace composable, participant/team-related tests, shell navigation, and SEO helpers.

Key product note from user: keep a summary card model in overview rather than inlining the full team UI there, and remember that solo users are still represented as teams.

User approved the implementation plan on 2026-04-02. Proceeding with the account-workspace tab split first because it is the route and test anchor for the participant team migration.

Implemented a participant-facing `team` tab in the account hackathon workspace, added the new `AccountHackathonParticipantTeamPanel`, moved participant team/submission/member/join-request flows into that tab, and rewired participant team CTAs to `/account/hackathons/:slug?tab=team`.

Retired the duplicate participant `/hackathons/:slug/teams` and `/hackathons/:slug/teams/:teamId` UIs by replacing them with redirects into the account Team tab. Shared participant team panels were restyled to the semi-transparent account-workspace card treatment.

Validation: `bun run lint` passed, `bun run typecheck` passed, and `bun run test:unit` passed.

Additional browser coverage attempt: targeted authenticated BDD for `team-workspace.feature` and `team-submission.feature` did not reach the UI because `bun tests/bdd/bootstrap.ts` failed first with `D1_ERROR: all VALUES must have the same number of terms: SQLITE_ERROR` while resetting fixtures. This remains a test-environment gap rather than a confirmed regression in the new UI.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Moved participant team management into the account hackathon `Team` tab and made it the canonical participant team surface. The account workspace now exposes a participant `team` tab alongside the existing staff/admin `teams` tab, the overview cards route approved users into that tab once submission starts, participant team panels use the modern semi-transparent account-workspace styling, and participant CTAs now target `/account/hackathons/:slug?tab=team` instead of the legacy standalone team pages. The old participant `/hackathons/:slug/teams...` routes now redirect into the account Team tab so there is no duplicate participant UI path. Updated unit tests and BDD specs to reflect the new canonical surface. Required validation passed locally (`bun run lint`, `bun run typecheck`, `bun run test:unit`). Targeted authenticated BDD could not be completed because fixture bootstrap failed before test execution with a D1 seed error (`all VALUES must have the same number of terms: SQLITE_ERROR`).
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
