---
id: TASK-247
title: Keep the participant leave-team action visible in solo workspace
status: Done
assignee:
  - '@codex'
created_date: '2026-04-17 16:11'
updated_date: '2026-04-17 16:14'
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
Participants in the account hackathon workspace can reach a solo-team workspace that tells them to leave the team before creating or joining another team, but the leave action is currently hidden whenever frontend availability resolves false. Update the participant workspace so team members still see the leave control in their own workspace, with the correct enabled or disabled state and an explanation when the action is unavailable.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A participant viewing their own team workspace still sees a leave-team action when they have an active team membership.
- [x] #2 The leave-team action is enabled when canonical leave rules allow the participant to leave the current team.
- [x] #3 The leave-team action stays visible but disabled with a user-facing unavailable reason when canonical leave rules block the action.
- [x] #4 Automated test coverage is updated for the participant workspace leave-team action visibility and state.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the participant workspace so active team members still render the leave-team action in their own team workspace instead of hiding it when leave availability is false.
2. Surface the existing leave-unavailable reason on the disabled control so blocked solo-team leave states remain visible and explained.
3. Add focused frontend test coverage for visible enabled and disabled leave-action states, then run bun run lint, bun run typecheck, and bun run test:unit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Changed the workspace tab to keep membership actions visible for active team members instead of hiding the leave control when leave availability is false.

Added disabled leave-action title wiring in the shared participant team workspace panel so blocked solo-team leave states now surface the canonical unavailable reason.

Confirmed canonical docs remain unchanged for this fix because the regression was frontend-only.

Validation passed: bun run lint, bun run typecheck, bun run test:unit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Adjusted the participant account workspace so active team members still see the `Leave team` control in their own team workspace even when the action is unavailable. The workspace parent now keeps the leave action visible for members, and the shared participant team workspace panel exposes the canonical unavailable reason on the disabled control instead of hiding the action entirely.

Frontend unit coverage now includes the leave-action visibility helper alongside the existing leave-availability cases that already cover enabled and blocked solo-team states. Canonical docs were confirmed unchanged because the issue was a frontend regression against the existing documented rules.

Validation run:
- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`

Risk / follow-up: this fix only changes the participant workspace tab. The Teams directory selected-team view still intentionally keeps leave actions out of that context because team management remains scoped to the Workspace tab.
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
