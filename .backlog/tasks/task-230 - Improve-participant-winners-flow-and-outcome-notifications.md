---
id: TASK-230
title: Improve participant winners flow and outcome notifications
status: Done
assignee:
  - codex
created_date: '2026-04-17 08:12'
updated_date: '2026-04-17 08:39'
labels: []
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/api-surface.md
  - docs/schema-outline.md
  - docs/permissions-matrix.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make end-of-hackathon outcomes understandable for participants by surfacing shortlist, winner, and ranking status inside the account-scoped hackathon experience and by sending participant-facing shortlist and winner emails at the canonical lifecycle points. Use the finalized finalist set when the hackathon starts `pitch` as the trigger for participant shortlist visibility and shortlist emails so shortlist review remains blind while admins are still revising finalists.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Participant overview and workspace surfaces show shortlisted status only for members of finalist teams, starting when the hackathon enters `pitch` and continuing through later outcome states; teams that are not shortlisted do not see a shortlist banner.
- [x] #2 After `winners_announced`, participant overview and workspace surfaces show whether the team won, which prize or prizes it won, and the team's final rank as `X/Y` when a ranked outcome exists so non-winning teams can still see their placement.
- [x] #3 After `winners_announced`, the account-scoped `Prizes` tab is relabeled to `Winners` and shows the winning team name next to each prize.
- [x] #4 Participant-facing outcome data is derived from canonical ranking and finalist data without exposing other teams' hidden shortlist identities before winners are announced.
- [x] #5 Starting `pitch` queues shortlist emails to each active member of every shortlisted team, and announcing winners queues congratulations emails to each active member of every winning team.
- [x] #6 Canonical docs and automated coverage are updated for the participant outcome visibility rules, lifecycle-triggered emails, and winners-tab behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend participant outcome derivation in the hackathon participation read path so each record can expose self-only shortlist and winner state, awarded prizes, and final rank/total-ranked-team data derived from canonical shortlist/final-ranking views.
2. Update the account hackathon page and participant workspace UI to render shortlist and winner callouts in Overview and Workspace, relabel the Prizes tab to Winners after announcement, and show winning team names next to each prize after winners are announced.
3. Add shortlist and winner transactional email delivery using the existing Resend plus Cloudflare Queue pattern, triggering shortlist notifications from `start-pitch` and winner congratulations from `announce-winners`.
4. Update canonical product and API docs for participant shortlist visibility from `pitch` onward, participant winner/rank visibility after announcement, and lifecycle-triggered outcome emails.
5. Add or update unit and integration coverage for participant outcome reads, winners-tab behavior, and both outcome email trigger paths; run lint, typecheck, and unit tests before handoff.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Ran targeted integration coverage for participation and outcome routes in addition to the required repo validation commands.

Adjusted one existing `no-explicit-any` lint issue in `app/utils/hackathon-credits.ts` so repo validation could pass on the current worktree.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Improved the participant winners flow end to end. The account overview and workspace now surface shortlist, winner, prize, and final-rank notices from a new self-scoped participation outcome summary. After winners are announced, the participant prizes tab is relabeled to Winners and shows winning team names next to each prize. Added shortlist and winner notification delivery through a dedicated hackathon outcome email queue wired into `start-pitch` and `announce-winners`, plus runtime and local queue configuration. Updated canonical docs for shortlist visibility, winner visibility, rank visibility, and notification timing. Validation passed with `bun run lint`, `bun run typecheck`, and `bun run test:unit`.

No open winners-flow issues remain from this implementation after lint, typecheck, unit tests, and targeted integration coverage.
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
