---
id: TASK-243
title: Delay submission locking until judging starts
status: Done
assignee:
  - codex
created_date: '2026-04-17 15:00'
updated_date: '2026-04-17 15:10'
labels:
  - judging
  - submissions
  - admin-ui
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/api-surface.md
  - docs/permissions-matrix.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Rename the admin operations lifecycle action in the submission phase from the current judging-preparation wording to participant-facing "Stop submissions", and change the lifecycle so this action no longer locks submissions. After admins stop submissions, team admins should still be able to edit, submit, and withdraw team submissions until the actual judging-start action. For blind-review hackathons, submissions lock when admins start blind review. For pitch-only hackathons, submissions lock when admins start the live pitch stage. Update canonical docs and automated coverage to match the new lifecycle behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The submission-phase admin lifecycle control is labeled "Stop submissions" and no longer describes judging preparation as the point where submissions lock.
- [x] #2 Starting the stop-submissions action moves the hackathon into judging preparation without changing submitted submissions to locked or freezing prize eligibility.
- [x] #3 During judging preparation, team admins can still edit, submit, and withdraw submissions until the lock point, and participant/admin UI copy reflects that submissions are still open for final changes.
- [x] #4 Starting blind review locks the submitted submissions, freezes prize eligibility, and requires the configured blind-review assignments for the submissions that were locked at that moment.
- [x] #5 For pitch-only hackathons, starting the live pitch stage locks the submitted submissions and freezes prize eligibility before the pitch workflow continues.
- [x] #6 Canonical docs and relevant automated tests are updated to reflect the new lock timing and action labels.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the canonical docs for hackathon lifecycle, submission lifecycle, permissions, and API surface so `judging_preparation` means submissions are stopped for team formation but not yet locked, with lock timing moved to `start_blind_review` for blind-review hackathons and `start_pitch` for pitch-only hackathons.
2. Refactor the judging-start backend so `start-judging-preparation` only transitions the hackathon into `judging_preparation`, while `start-blind-review` locks submitted submissions, freezes prize eligibility, and creates blind assignments, and pitch-only `start-pitch` performs the same lock and prize-freeze work before opening the live pitch stage.
3. Relax submission editing, submit, and withdraw guards to allow those actions during `judging_preparation` until the submission record is locked, while keeping team-formation lifecycle rules unchanged.
4. Update admin and participant UI copy and lifecycle controls so the submission-phase action is labeled `Stop submissions`, `judging_preparation` messaging no longer claims submissions are already locked, and availability reasons reflect the new lock timing.
5. Update focused unit and BDD tests for judging lifecycle and participant submission availability, then run `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented the lifecycle split so `start-judging-preparation` only transitions the hackathon into `judging_preparation`, while blind-review locking, prize snapshots, and blind assignments now happen inside `start-blind-review`.

Implemented the pitch-only lock point inside `start-pitch`, so pitch-only hackathons now freeze prize eligibility and lock submitted work when the live pitch stage starts.

Relaxed existing-submission mutation guards to allow edit, submit, withdraw, and admin-withdraw during `judging_preparation`, while keeping first-draft creation restricted to `submission_open`.

Updated admin and participant copy, lifecycle labels, and helper logic so the Operations button reads `Stop Submissions` and `judging_preparation` messaging no longer claims submissions are already locked.

Updated unit coverage for judging lifecycle, submission guards, participant submission availability, hackathon state summaries, and admin intervention rules.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Split the submission-stop and submission-lock behaviors. The Operations control in the submission phase now reads `Stop Submissions`, and that action only moves the hackathon into `judging_preparation`. Existing submitted or draft work can still be revised, submitted, withdrawn, or admin-withdrawn during `judging_preparation`, while first-draft creation remains limited to `submission_open`.

Submitted work now locks when judging actually starts: `start-blind-review` locks submitted work, freezes prize eligibility, and creates blind-review assignments; pitch-only `start-pitch` locks submitted work, freezes prize eligibility, and seeds the live pitch lineup from those submissions. Canonical docs were updated to match the new lifecycle semantics.

Validation run:
- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`

Test gaps / notes:
- I did not run `bun run test:integration` or `bun run test:bdd` because the repository instructions for this task required `lint`, `typecheck`, and `test:unit` before handoff. Relevant unit coverage was updated for the changed lifecycle and submission behavior.
- The worktree already contained unrelated concurrent edits outside this task’s files; I left them untouched.
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
