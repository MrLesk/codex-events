---
id: TASK-263
title: Refresh Operations pitch-review coverage during live admin monitoring
status: Done
assignee:
  - codex
created_date: '2026-04-17 20:28'
updated_date: '2026-04-17 20:35'
labels:
  - admin-workspace
  - operations
  - pitch-review
  - ux
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Keep the admin Operations pitch-review panel in sync while judges submit votes from other sessions so live coverage, warnings, and the move-to-final-deliberation action reflect the current server state without requiring a manual reload.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The Operations pitch-review panel refreshes the data it depends on while the admin is monitoring the lifecycle view so completed pitch reviews from other sessions become visible without a manual reload
- [x] #2 When at least one pitch review has been submitted on the current finalist set, the move-to-final-deliberation action becomes enabled after the live refresh catches up
- [x] #3 The live refresh is scoped to the relevant Operations lifecycle state and does not continue running after the panel leaves pitch review
- [x] #4 Relevant tests or implementation notes are updated and required validation passes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a scoped live-refresh mechanism inside `app/components/account/hackathons/AccountHackathonAdminOperationsPanel.vue` that refreshes the admin workspace only while the Operations lifecycle view is open during `pitch_review`.
2. Reuse the existing `workspace.refreshWorkspace()` path so hackathon, assignments, and leaderboard state stay consistent with the server instead of introducing a second refresh implementation.
3. Keep the loop bounded and tear it down when the component unmounts or when the page leaves the relevant state, avoiding background polling outside live pitch-review monitoring.
4. Update implementation notes and run `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-04-17: Verified the local D1 state for `codex-vienna-2026-04-18-registration-today` already contained completed `pitch_review` assignments on the persisted finalist set. The inability to advance from Operations was caused by stale admin workspace data, not by the server-side lifecycle rule.

2026-04-17: Added a scoped live-refresh loop to `AccountHackathonAdminOperationsPanel.vue` that refreshes hackathon, role assignments, assignments, and leaderboard data every 5 seconds only while the Operations lifecycle view is on `pitch_review`, the admin can manage the hackathon, no local mutation is pending, and the document is visible.

2026-04-17: Canonical docs remain unchanged because the fix only updates live admin data freshness; no product rule changed.

2026-04-17: Validation passed locally with `bun run lint`, `bun run typecheck`, and `bun run test:unit`. No new component-level tests were added because this panel does not currently have a Vue component test harness; the gap is limited to browser-level live-refresh behavior.

2026-04-17: Discovered a deeper data-shape bug while validating the live refresh. The admin-facing `GET /api/hackathons/:hackathonId/judging/assignments` route was returning only `assigned` and `judge_started` rows even for hackathon admins and platform admins, which meant Operations could never count submitted pitch votes from completed assignments.

2026-04-17: Updated the admin assignments route to return the full hackathon assignment set for admin viewers while keeping judge-scoped viewers limited to their active assignments. Added integration coverage in `tests/integration/server/api/judging-routes.test.ts` for admin visibility across `assigned`, `judge_started`, `judge_completed`, and `skipped` statuses.

2026-04-17: Revalidated with `bun run lint`, `bun run typecheck`, `bun run test:unit`, and targeted integration coverage via `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/judging-routes.test.ts`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed the Operations pitch-review visibility bug end to end. The local D1 state for `codex-vienna-2026-04-18-registration-today` already contained completed `pitch_review` assignments on the persisted finalists, so final deliberation should have been allowed. Two separate issues prevented the UI from reflecting that reality.

First, the Operations panel was stale while judges submitted votes from other sessions. `AccountHackathonAdminOperationsPanel.vue` now runs a scoped live refresh while the admin is viewing the Operations lifecycle section in `pitch_review`. The refresh updates the current hackathon, role assignments, assignments, and leaderboard every 5 seconds, pauses while a local admin mutation is pending, skips hidden tabs, and tears down automatically when the panel leaves pitch review or unmounts.

Second, the admin-facing `GET /api/hackathons/:hackathonId/judging/assignments` route was incorrectly filtering out `judge_completed` and `skipped` rows even for hackathon admins and platform admins. That made Operations show `0 of 1` pitch reviews and hide the submitted judge even after refresh. The route now returns the full assignment set for admin viewers while preserving the existing active-only filtering for judges viewing their own inbox/workspace. Integration coverage was added to confirm admins can now see assignments across `assigned`, `judge_started`, `judge_completed`, and `skipped` statuses.

Together, those fixes keep the Operations pitch-review coverage summary, warning copy, and `Move to final deliberation` button aligned with the current server state without requiring a manual reload. Canonical docs remain unchanged because no lifecycle rule changed.

Validation passed locally: `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/judging-routes.test.ts`. There is still no dedicated Vue component test harness for this panel, so the remaining automation gap is limited to browser-level live-refresh behavior.
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
