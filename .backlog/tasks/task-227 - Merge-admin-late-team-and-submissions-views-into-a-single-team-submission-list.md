---
id: TASK-227
title: Merge admin late-team and submissions views into a single team submission list
status: Done
assignee:
  - '@codex'
created_date: '2026-04-17 07:58'
updated_date: '2026-04-17 08:06'
labels:
  - admin
  - ui
  - submissions
  - teams
dependencies: []
references:
  - app/components/account/hackathons/AccountHackathonAdminOperationsPanel.vue
  - app/components/admin/AdminTeamsOperationsPanel.vue
  - app/components/admin/AdminApplicationsReviewPanel.vue
  - app/utils/admin-workspace.ts
documentation:
  - docs/README.md
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/permissions-matrix.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the admin-only submissions tab on `/account/hackathons/:slug?tab=submissions` so hackathon admins review one canonical team list instead of separate Late Teams and Submissions cards. Treat missing or draft submission records as team submission states within that single list. The UI should not frame teams as late before the hackathon has actually entered the submission phase. Reuse the existing account hackathon participant-style filter/search pattern for this tab, while keeping the visible status tabs minimal and operational.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The admin submissions tab renders one searchable team list that includes teams with no submission record, draft submissions, and submitted-or-later submissions in the same surface.
- [x] #2 The tab does not label or highlight teams as late before the hackathon has entered the submission phase, while still showing team submission state clearly.
- [x] #3 Admins can search the merged list by the existing metadata fields and switch between a minimal set of submission-state filters without a separate late-teams card.
- [x] #4 Each team row shows the current submission status using canonical labels, including at least no record, draft, and submitted, with later lifecycle statuses retained where relevant.
- [x] #5 Existing submission-detail expansion and admin intervention behavior continue to work and validation coverage is updated for the revised submissions tab behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Replace the submissions-tab filter model with a minimal participant-style pill set built around canonical submission states rather than the special late bucket.
2. Rework `app/components/admin/AdminTeamsOperationsPanel.vue` into one searchable team list that shows team submission status badges and keeps inline detail expansion.
3. Gate any late framing to hackathon states at or after `submission_open`; before that, show `no record` and `draft` as statuses only.
4. Update affected unit coverage for the submissions tab behavior and run `bun run lint`, `bun run typecheck`, and `bun run test:unit` before handoff.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Merged the admin submissions tab from two overlapping cards into one canonical team list and switched the tab filter model to participant-style status pills (`all`, `no record`, `draft`, `submitted`, plus `locked`/`out` only when present or selected).

Removed the explicit late-team surface. Before `submission_open`, the tab now shows team submission state only and adds a neutral notice clarifying that `No record` and `Draft` are not late queues yet.

Validation results: `bun run typecheck` passed and `bun run test:unit` passed. `bun run lint` remains blocked by an unrelated existing `@typescript-eslint/no-explicit-any` error in `app/utils/hackathon-credits.ts:63` outside TASK-227.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Merged the admin submissions workspace into a single `Teams and submissions` list so hackathon admins no longer see the same teams split across separate `Late Teams` and `Submissions` cards. The new surface keeps the existing metadata search, reuses the participant-style pill filter pattern, and shows each team’s current submission status directly in the row with `No record`, `Draft`, `Submitted`, `Locked`, `Withdrawn`, or `Disqualified` badges as appropriate.

On the helper side, the submissions dashboard metrics and filtering logic now work from exact submission states instead of the old `late/ready/out` bucket model. The UI no longer frames teams as late before the hackathon has entered `submission_open`; when the tab is viewed earlier, it shows a neutral notice clarifying that missing or draft records are current team state only. Submission detail expansion and admin interventions were kept intact.

Validation: `bun run typecheck` passed and `bun run test:unit` passed, including the updated admin-workspace helper coverage. `bun run lint` did not pass because of an unrelated existing `@typescript-eslint/no-explicit-any` error in `app/utils/hackathon-credits.ts:63`, which is outside the scope of this task and already present in the current worktree.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [ ] #3 Relevant validation commands pass
- [x] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [x] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
