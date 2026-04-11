---
id: TASK-191
title: >-
  Allow participants to leave solo teams during team formation and move to
  another team
status: Done
assignee:
  - codex
created_date: '2026-04-11 21:43'
updated_date: '2026-04-11 22:00'
labels: []
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Participants are currently trapped in the Team tab when they are the sole admin/member of a one-person team. The frontend and backend both require another active admin to remain, which means an approved participant cannot leave a solo team and then request to join another open team. Update the canonical behavior so team formation supports this move without leaving invalid team state or orphaning team-owned submission data.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Canonical docs define when a participant may leave a solo team during team formation and what happens to the team record after a last-member leave.
- [x] #2 During registration_open and submission_open, a participant can leave a team when another active admin remains or when they are the last active member of a team that has no active draft or submitted submission.
- [x] #3 Leaving the last active member of a team with an active draft or submitted submission remains blocked and returns a clear user-facing reason.
- [x] #4 After a last-member leave, the participant is no longer treated as having an active team membership in that hackathon and can request to join another open team from the Team tab.
- [x] #5 Backend, frontend, and automated tests cover the updated leave-team and join-another-team behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update canonical docs so team-formation rules allow a participant to leave when another admin remains, or when they are the last active member of a team with no active draft or submitted submission; define that a last-member leave dissolves the team from active team-formation workflows.
2. Update backend team-leave rules and the leave-team route to allow a last-member leave only during registration_open or submission_open when the team has no active draft or submitted submission, and return a clear blocked reason otherwise.
3. Treat teams with zero active members as inactive in team-directory and team-workspace flows so the former member is no longer considered team-bound and can request to join another open team.
4. Update frontend availability logic and participant Team tab behavior, including clearing stale current-team selection after a last-member leave.
5. Update unit and integration tests, then run lint, typecheck, unit tests, and targeted integration coverage.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Backend implementation required a matching database migration because the existing team-member trigger still enforced the old last-admin invariant and blocked canonical team dissolution.

The remove-member route now rejects self-removal so participant self-leave remains routed through the dedicated leave endpoint and keeps dissolve cleanup in one path.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated canonical team-formation behavior so a participant can leave a solo team during `registration_open` or `submission_open` when that team has no active draft, submitted, or locked submission. Canonical docs now define dissolved teams as retained records with zero active members that disappear from participant team-formation reads while remaining visible to staff/admin actors.

Backend changes updated the leave/remove guard, hid dissolved teams from participant team list/detail/join flows, blocked join requests and approvals against inactive teams, and returned `teamDissolved` from the leave route. The leave route now dissolves empty teams by closing pending join requests and disabling join openness. A follow-up database migration (`drizzle/0028_team_dissolution_invariants.sql`) updated the team-member admin trigger so canonical solo-team dissolution is allowed while the old invalid-admin-removal cases remain blocked. The remove-member route now forbids self-removal and directs callers to the leave action.

Frontend changes updated leave availability messaging for solo teams with active submissions, cleared stale selected-team query state after a dissolved leave, and let the former solo-team participant request to join another team from the Team tab.

Tests updated in unit, integration, and migration coverage for leave availability, dissolve visibility, pending join-request closure, self-removal blocking, and the underlying database invariants.

Validation run:
- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`
- `bun vitest run --config vitest.integration.config.ts tests/integration/server/api/team-formation-routes.test.ts`
- `bun vitest run --config vitest.integration.config.ts tests/integration/server/database/migration.test.ts`

Risk / follow-up: participant team-selection state now clears after a dissolved leave, but any future alternate self-leave entrypoints must keep using the dedicated leave route so dissolve cleanup and join-request closure stay centralized.
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
