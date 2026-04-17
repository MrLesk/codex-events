---
id: TASK-253
title: >-
  Simplify admin submissions rows and move submission details into the
  expandable body
status: Done
assignee:
  - '@codex'
created_date: '2026-04-17 16:40'
updated_date: '2026-04-17 17:00'
labels: []
dependencies: []
documentation:
  - app/components/admin/AdminTeamsOperationsPanel.vue
  - app/components/account/hackathons/AccountHackathonCreditsPanel.vue
  - app/components/account/hackathons/AccountHackathonAdminOperationsPanel.vue
  - app/utils/admin-workspace.ts
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refine the account hackathon admin submissions tab so each row is collapsed by default and the collapsed state shows only the team name, project name, submission status chip, and the existing expand/collapse control style used in the credits panel. Move secondary submission information into the expanded body, including team members, submission summary, repository link, demo link, updated timestamp, submitted timestamp, and the admin withdraw action.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The admin submissions list renders rows collapsed by default and the collapsed row shows only the team name, project name, submission status chip, and one expand or collapse control.
- [x] #2 The expanded submission body shows team members, submission summary, repository link, demo link, updated timestamp, and submitted timestamp using the existing admin submissions data.
- [x] #3 The admin withdraw action moves out of the collapsed row and is only available inside the expanded submission details for rows where admin withdrawal is allowed.
- [x] #4 The updated submissions row layout reuses the existing credits-panel style of expand or collapse control rather than keeping the current details or hide-details treatment.
- [x] #5 Relevant unit or component coverage is updated for the revised submissions row behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update `app/components/admin/AdminTeamsOperationsPanel.vue` so every submission row is collapsed by default and the collapsed header shows only the team name, project label, submission status chip, and the existing credits-style `Expand`/`Collapse` control.
2. Keep rows expandable even when the submission status is `none`, because the expanded body must still expose team-member context for admin review.
3. Move team members, submission summary, repository link, demo link, updated timestamp, submitted timestamp, and the admin-withdraw workflow into the expanded body while preserving the existing intervention policy logic.
4. Add or update focused tests for the revised row behavior, then run `bun run lint`, `bun run typecheck`, and `bun run test:unit` before handoff.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Reworked `AdminTeamsOperationsPanel` so submission rows now stay collapsed by default, use the credits-style `Expand`/`Collapse` control, and move team-member context plus submission metadata into the expanded body.
Added small admin-workspace formatting helpers for the new row header and member-detail rendering, then updated the admin operations BDD step to expand a row before using the inline admin-withdraw flow.
Validation passed with `bun run lint`, `bun run typecheck`, `bun run test:unit`, plus a focused `bunx vitest run tests/unit/app/utils/admin-workspace.test.ts` check during implementation.

User clarified the expanded submission layout should truly swap the metadata block and withdraw card: top row should be description on the left and withdraw on the right, with repository/demo/date metadata moved below that row. Reopening the task briefly to apply the requested layout correction.

Applied the requested expanded-body layout correction: the top row now pairs description on the left with the withdraw card on the right, and the repository/demo/updated/submitted metadata moved into the section below that row. Revalidated with `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Simplified the admin submissions list rows so each team now renders as a collapsed-by-default header with only the team name, project label, submission status badge, and a credits-style `Expand`/`Collapse` control. Expanding a row reveals the team members first, then a top row with the submission description on the left and the admin-withdraw card on the right. The repository link, demo link, and updated/submitted timestamps now sit in the section below that row. The previous last-activity block and header-level withdraw action were removed from the collapsed view.

Moved the admin-withdraw workflow into the expanded details body for eligible draft and submitted rows, preserving the existing requester-selection and note capture requirements. Rows without a submission record still expand so admins can inspect the team-member context, which matches the agreed requirement that details should remain useful even before a submission exists.

Added focused unit coverage for the new admin-workspace formatting helpers that drive the row header and member rendering, and updated the BDD admin-operations step to expand a team row before interacting with the inline withdraw form. Validation passed with `bun run lint`, `bun run typecheck`, and `bun run test:unit`.

Risk / follow-up: the withdraw card now occupies the right-side top slot in the expanded layout. If admins later want a lighter-weight destructive-action treatment, that should be an explicit UX decision rather than restoring a second top-level row action.
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
