---
id: TASK-195
title: Refine the account hackathon operations tab into a lifecycle dashboard
status: Done
assignee:
  - codex
created_date: '2026-04-12 11:58'
updated_date: '2026-04-12 13:19'
labels:
  - frontend
  - admin
  - hackathon-workspace
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make the account-scoped admin Operations tab focus on the lifecycle of an already-created hackathon. The tab should emphasize the current lifecycle state, show only state-relevant at-a-glance operational metrics, keep lifecycle state transitions accessible, remove irrelevant summary cards for the current state, and remove duplicate judging-criteria management from this tab because judging criteria are already managed in Settings. For presentation, collapse active judging workflow states into a single Judging dashboard treatment for this tab.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The admin Operations tab shows a state-specific lifecycle overview for supported hackathon states instead of a broad multi-section admin surface.
- [x] #2 When the hackathon is in registration_open, the overview highlights application outcomes and total team count.
- [x] #3 When the hackathon is in submission_open, the overview highlights submitted submissions relative to total teams and total team count.
- [x] #4 When the hackathon is in the active judging bucket, the overview highlights judged submissions versus submissions left to judge and average submissions per judge.
- [x] #5 When the hackathon is completed, the overview highlights application outcomes and submitted submissions relative to total teams.
- [x] #6 The Operations tab keeps lifecycle transition actions available for the current hackathon state without showing unrelated summary cards for other states.
- [x] #7 Judging-criteria management is no longer shown in the Operations tab, and the Settings tab remains the configuration surface for judging criteria.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Refactor the Operations tab top section into one state-aware lifecycle card plus two current-state metric cards using the existing hackathon state badge color system.
2. Derive the displayed lifecycle bucket and metrics from existing admin workspace data so registration, submission, judging, and completed each surface only the counts relevant to that phase.
3. Remove the duplicate Judging Criteria card and the extra top summary cards from the competition panel so the page no longer repeats settings-owned configuration or irrelevant status cards.
4. Keep lifecycle transition controls available from the Operations tab and update surrounding copy so the tab reads as lifecycle oversight for the current hackathon.
5. Update the relevant unit and browser-facing tests for the new Operations-tab behavior, then run lint, typecheck, and unit tests.

6. Remove the duplicate in-card lifecycle chip and replace the repeated state title with a neutral operations heading so the page header remains the single canonical place where the current state label appears.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
User approved the recorded implementation plan and the judging dashboard bucket will cover judging_preparation, judge_review, shortlist, and winners_announced.

Implemented a state-aware Operations hero card and metric cards for registration_open, submission_open, judging, and completed while leaving unsupported states on a minimal lifecycle-control fallback.

Removed duplicate judging-criteria management and extra top summary cards from the competition panel, then gated lower competition sections by lifecycle state so operations stays focused on the current phase.

Validation passed locally: bun run lint, bun run typecheck, bun run test:unit.

User requested a follow-up cleanup on the Operations hero to remove repeated lifecycle state messaging because the page header already carries the canonical state chip.

Follow-up cleanup removed the duplicate in-card lifecycle chip and replaced the repeated state title with a neutral operations heading so the page header remains the single explicit state label.

Validation passed again after the cleanup: bun run lint, bun run typecheck, bun run test:unit.

User requested a second follow-up on the Operations hero to make current status timing clearer, move metric cards above the lifecycle action block, and change submission-phase metrics to Drafts created and Submissions sent.

Follow-up refinement requested: make Operations hero explicitly show current status and time frame, clarify why lifecycle action is disabled and when it becomes available, move state-specific metric cards above the hero, and change submission-open metrics to `Drafts created` and `Submissions sent` without a separate teams-count card.

Implemented the follow-up Operations-tab refinement: state-specific metric cards now render above the lifecycle hero, submission-open metrics are `Drafts created` plus `Submissions sent`, the hero now shows explicit `Current status` and `Time frame` rows, and lifecycle-action messaging now explains when disabled actions become available.

Follow-up refinement requested: match the Operations lifecycle action button sizing to the Settings tab button pattern so the CTA uses the same standard width and height as other primary actions.

Matched the Operations lifecycle CTA to the Settings tab button sizing by switching it to the shared `AppButton size=md` pattern instead of the larger `lg` token.

Follow-up refinement requested: flatten the Operations lifecycle hero to avoid nested card surfaces and update AGENTS.md with an explicit UI hierarchy rule that forbids card-in-card admin dashboard layouts unless the nested surface is a truly separate workflow.

Flattened the Operations hero so it stays a single surface with internal dividers and sections instead of nested inset cards, and updated AGENTS.md with an explicit dashboard UI hierarchy rule that prohibits card-in-card layouts unless the nested surface is a truly separate workflow.

Follow-up refinement requested: in registration-open Operations cards, remove the top total from Applications so only Approved and Rejected remain, and replace the Teams top total with breakdown boxes for Solo and Multiple people teams only.

Adjusted the registration-open Operations cards so Applications is now breakdown-only with Approved and Rejected boxes, and Teams is now breakdown-only with Solo and Multiple people boxes.

Follow-up refinement requested: remove the redundant Operations hero intro copy entirely so the card starts directly with current status, time frame, and next lifecycle action.

Removed the remaining Operations hero intro copy and heading so the hero starts directly with current status, time frame, and next lifecycle action.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Refined the account hackathon Operations tab into a lifecycle dashboard for already-created hackathons. The Operations surface now leads with a state-aware hero card that exposes only the current lifecycle transition and two phase-specific metric cards for registration, submission, judging, and completed states. Unsupported states keep a minimal lifecycle-control fallback instead of the old generic summary grid.

Trimmed the lower competition surface so it no longer duplicates Settings-owned judging-criteria management or renders extra top summary cards. Competition detail panels are now shown only in the lifecycle phases where they are operationally relevant, and winner announcement/completion actions are no longer duplicated below the primary lifecycle card.

Follow-up cleanup removed the duplicate in-card lifecycle chip and replaced the repeated state title with a neutral operations heading so the page header remains the single explicit state label for the current hackathon state.

Added direct unit coverage for the operations-phase state grouping helper. Validation passed locally with bun run lint, bun run typecheck, and bun run test:unit.

Follow-up refinement made the Operations hero more explicit: it now shows `Current status` and `Time frame`, explains disabled lifecycle actions in plain language with concrete timing, and moves the state-specific metric cards above the hero. Submission-open metrics now surface `Drafts created` and `Submissions sent` instead of a separate teams-count card.

Validation passed locally again with bun run lint, bun run typecheck, and bun run test:unit.

Final polish normalized the Operations lifecycle CTA to the same standard primary button size used in Settings, so the action now matches the rest of the admin workspace for both height and overall visual weight.

Validation passed locally again with bun run lint, bun run typecheck, and bun run test:unit.

Final cleanup removed the nested card treatment from the Operations hero and replaced it with one outer surface using internal section breaks only. AGENTS.md now also includes an explicit dashboard/admin UI rule: default to one container depth per section, use spacing and dividers before adding another bordered surface, and justify any nested card explicitly.

Validation passed locally again with bun run lint, bun run typecheck, and bun run test:unit.

Final registration-open cleanup removed the top total from the Applications card and replaced the Teams total with `Solo` and `Multiple people` breakdown boxes only, matching the simplified card hierarchy the user requested.

Validation passed locally again with bun run lint, bun run typecheck, and bun run test:unit.

Final cleanup removed the leftover Operations hero intro entirely. The card now starts directly with the lifecycle facts and action controls instead of a generic heading and explanatory subtitle.

Validation passed locally again with bun run lint, bun run typecheck, and bun run test:unit.
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
