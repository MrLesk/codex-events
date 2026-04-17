---
id: TASK-261
title: >-
  Tighten pitch-review completion gate and expose missing judge coverage in
  Operations
status: Done
assignee: []
created_date: '2026-04-17 19:56'
updated_date: '2026-04-17 20:06'
labels:
  - judging
  - admin
  - frontend
  - backend
  - ux
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - app/components/account/hackathons/AccountHackathonAdminOperationsPanel.vue
  - app/utils/admin-workspace.ts
  - server/utils/shortlist.ts
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the pitch-review Operations workflow so hackathon admins can see finalist-by-finalist pitch review coverage before closing pitch review. Moving to final deliberation must stay allowed when some finalist pitch assignments are still missing, but it must be blocked when there are zero submitted pitch-review outcomes. When admins proceed with partial coverage, Operations should require an explicit confirmation that lists each finalist submission together with the judges who have not yet submitted a completed pitch review for that submission.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The Operations pitch-review section shows each finalist submission together with which judges have completed a pitch review and which judges are still missing for that submission.
- [x] #2 Move to final deliberation is disabled when pitch review has zero completed pitch-review assignments across all finalists and explains that at least one submitted pitch review is required.
- [x] #3 When at least one pitch review is completed but some finalist judge assignments remain incomplete, moving to final deliberation prompts for confirmation that lists the missing judges for each affected finalist submission.
- [x] #4 The server-side start-final-deliberation guard rejects pitch-review closure when zero completed pitch-review assignments exist, while still allowing closure with partial coverage once at least one completed pitch review exists.
- [x] #5 Canonical docs and automated coverage are updated for the new pitch-review closure rule and Operations visibility.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-04-17: Implemented shared pitch-review coverage derivation in the admin workspace so Operations can show reviewed vs missing judges per finalist and use the same coverage summary to gate final-deliberation entry.

2026-04-17: Tightened the server-side `start-final-deliberation` guard for `pitch_review` so at least one completed pitch assignment on the active finalist set is required, while partial judge coverage remains allowed once that threshold is met.

2026-04-17: Updated canonical lifecycle, domain, permissions, and API docs to state that pitch review can close with partial coverage only after at least one submitted pitch vote exists.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Operations now exposes per-finalist pitch-review coverage during `pitch_review`. The admin panel derives finalist coverage from the active finalist submission IDs and pitch-review assignments, then shows each finalist with reviewed judges, missing judges, and submitted-review counts so admins can see exactly what is still missing before closing the stage.

The final-deliberation transition is now gated on actual pitch-review coverage instead of stage alone. Both Operations buttons disable when zero completed pitch-review assignments exist, and the server-side `start-final-deliberation` route now rejects direct requests in that state with `completed_pitch_reviews_required`. Once at least one pitch review has been submitted, the transition stays available even if coverage is partial.

When coverage is partial, both Operations entry points reuse the same confirmation flow before closing pitch review. The confirmation explicitly lists each finalist submission together with the judges who have not submitted a completed pitch review for that submission, matching the visibility shown in the panel.

Docs were updated to make the new closure rule canonical across the lifecycle, domain model, permissions matrix, and API surface. Automated coverage now includes unit tests for the pitch-review lifecycle control and coverage helper, unit tests for the final-deliberation guard, and integration tests that verify `pitch_review -> final_deliberation` rejects zero submitted pitch reviews but still allows partial coverage after the first completed vote.

Validation passed locally: `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bun run test:integration`. No dedicated browser automation was added for the new confirmation dialog; the UI behavior is covered by shared helper tests plus the server-side guard.
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
