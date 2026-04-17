---
id: TASK-244
title: Hide dissolved teams from non-admin team views
status: Done
assignee:
  - codex
created_date: '2026-04-17 15:06'
updated_date: '2026-04-17 15:12'
labels:
  - teams
  - admin-ui
  - bug
dependencies: []
documentation:
  - /Users/alex/projects/codex-hackathons/docs/domain-model.md
  - /Users/alex/projects/codex-hackathons/docs/api-surface.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the account-scoped hackathon Teams experience so dissolved teams are not visible to non-admin users. Hackathon admins and platform admins must still be able to inspect dissolved teams for operational context, and the UI must label those teams clearly instead of rendering them as ordinary active teams with zero members.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Approved participants and judges do not see dissolved teams in account-scoped Teams list or shared team-link resolution.
- [x] #2 Hackathon admins, platform admins, and staff can still view dissolved teams in the account-scoped Teams experience.
- [x] #3 Any dissolved team visible to an admin or staff user is explicitly labeled with a `Dissolved` status chip in both list and selected-team/detail states.
- [x] #4 Team list and detail reads continue to preserve existing active-team behavior for all supported actors.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the team list and team detail read paths so dissolved-team visibility is controlled explicitly for admin/staff operational access instead of all participant-facing consumers.
2. Add a serialized dissolved-state flag to team summaries/details so the shared account Teams UI can distinguish operationally retained teams from active teams.
3. Update the account Teams UI to render a `Dissolved` chip for any visible dissolved team in both the directory card and selected-team/detail view without changing active-team actions.
4. Add regression tests for dissolved-team API visibility and UI presentation, then run `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-04-17: User confirmed dissolved teams should remain visible to hackathon/platform admins and staff, but not to participants or judges.

2026-04-17: Added regression coverage for dissolved-team visibility in team formation route tests and for dissolved-team state helpers in unit tests.

2026-04-17: Validation passed locally: `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/team-formation-routes.test.ts`, `bun run lint`, `bun run typecheck`, `bun run test:unit`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated the shared account Teams UI so retained dissolved teams are labeled explicitly for operational viewers instead of rendering like ordinary zero-member teams. Added shared client helpers for active-member counting and dissolved-state detection, surfaced the operational copy path in the account Teams tab, and added regressions proving approved participants cannot resolve dissolved teams while staff still can. Required validation passed locally: `bun run lint`, `bun run typecheck`, and `bun run test:unit`, plus the targeted integration suite for team formation routes.
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
