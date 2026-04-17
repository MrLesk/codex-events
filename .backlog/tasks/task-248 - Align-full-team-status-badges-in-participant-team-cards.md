---
id: TASK-248
title: Align full-team status badges in participant team cards
status: Done
assignee:
  - '@codex'
created_date: '2026-04-17 16:18'
updated_date: '2026-04-17 16:23'
labels: []
dependencies: []
documentation:
  - app/components/teams/ParticipantTeamDirectoryPanel.vue
  - app/utils/team-workspace.ts
  - tests/unit/app/utils/team-workspace.test.ts
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The participant team directory currently shows `Open to join requests` and `Full` at the same time for full teams, which is contradictory. Update the directory card so full teams no longer render the open-to-join status chip, and refine the `Full` badge styling so it reads as an intentional capacity state rather than a neutral afterthought.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Participant team cards do not show `Open to join requests` when the team is already full.
- [x] #2 Full participant team cards still communicate capacity clearly through a dedicated badge state.
- [x] #3 The full-team badge styling uses a stronger outline and color treatment that matches the existing participant UI language.
- [x] #4 Automated coverage is updated for the directory-card full-team status logic.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a small shared helper for participant team-card status so full capacity takes precedence over join-policy wording and can be unit tested.
2. Update the participant team directory card to use that helper, suppress the contradictory `Open to join requests` badge when a team is full, and restyle the `Full` badge with a stronger warning-outline treatment that fits the existing badge system.
3. Extend unit coverage for the new status helper and run bun run lint, bun run typecheck, and bun run test:unit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added a shared participant team-directory status-badge helper so full teams suppress the join-policy badge instead of showing contradictory open-to-join state.

Updated the participant team directory card to keep the dedicated `Full` badge and restyled it with a stronger warning-outline treatment.

Confirmed canonical docs remain unchanged because this is a participant UI consistency fix within the existing team-capacity rules.

Validation passed: bun run lint, bun run typecheck, bun run test:unit.

Refined the participant badge palette after UI review: `Your team` now uses the blue info badge, and `Solo Team` now uses a higher-contrast violet outline treatment across the directory card and workspace header.

Re-ran validation after the palette refinement: bun run lint, bun run typecheck, bun run test:unit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated participant team directory cards so full teams no longer show the `Open to join requests` badge alongside the dedicated `Full` chip. The directory now resolves join-policy badge state through a shared helper that suppresses the open/closed badge for solo teams and full teams, keeping the participant card logic aligned with the existing full-team detail behavior.

The participant badge palette was also refined after UI review: `Your team` now uses the blue info badge, `Full` uses a stronger warning-outline style with a warm tinted background, and `Solo Team` uses a higher-contrast violet outline treatment that remains readable in both light and dark themes across the directory card and workspace header. Unit coverage was extended for the new directory status helper, and canonical docs were confirmed unchanged because this was a participant UI refinement within the existing capacity model.

Validation run:
- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`

Risk / follow-up: this change intentionally affects participant team surfaces only. Admin team visibility surfaces still reflect raw join-policy state and were left unchanged.
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
