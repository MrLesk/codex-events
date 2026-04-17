---
id: TASK-255
title: Repair admin submissions tab first-load refresh after hard reload
status: Done
assignee:
  - '@codex'
created_date: '2026-04-17 17:03'
updated_date: '2026-04-17 17:20'
labels: []
dependencies: []
documentation:
  - app/components/account/hackathons/AccountHackathonAdminOperationsPanel.vue
  - app/composables/useAdminWorkspace.ts
  - app/components/admin/AdminTeamsOperationsPanel.vue
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fix the account hackathon admin submissions tab so submission rows appear correctly on a direct page load or browser reload without requiring the user to switch to another tab and back. The current behavior suggests the submission monitor can initialize before the team list is ready and fail to refetch once team data becomes available.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Loading the account hackathon page directly on the `submissions` tab shows the expected submission rows once the initial data load completes, without requiring a manual tab switch.
- [x] #2 The submissions monitor refetch logic remains scoped to the submissions section and does not introduce redundant reload behavior for unrelated admin sections.
- [x] #3 Existing admin submissions search, filter, and row rendering behavior remains unchanged after the first-load fix.
- [x] #4 Relevant automated coverage is added or updated for the submissions first-load refresh behavior, or the test gap is documented if automation is not practical.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a small admin-workspace helper that decides when the submissions monitor is ready to load, based on the active section, admin access, team-list load status, and whether any teams exist.
2. Update `AccountHackathonAdminOperationsPanel.vue` so the submissions monitor `useAsyncData` watches team-list readiness directly and only runs once those prerequisites are satisfied, instead of relying on a follow-up refresh.
3. Add focused unit coverage for the readiness helper so the first-load regression is exercised without introducing a new component test harness.
4. Run `bun run lint`, `bun run typecheck`, and `bun run test:unit` before handoff.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Replaced the earlier refresh-based idea with a deterministic readiness gate for the submissions monitor: the per-team submission detail query now waits until the submissions tab is active, the actor can manage the hackathon, the team list load has reached `success`, and at least one team exists.
Updated `AccountHackathonAdminOperationsPanel.vue` to watch that readiness state directly in `useAsyncData`, which fixes the direct-load submissions regression without adding a blind catch-up refresh.
Added focused unit coverage for the readiness helper in `tests/unit/app/utils/admin-workspace.test.ts` and reran `bunx vitest run tests/unit/app/utils/admin-workspace.test.ts`, `bun run lint`, `bun run typecheck`, and `bun run test:unit` successfully.

User reported the first readiness-gate fix still never loaded submissions. The remaining issue is likely async-data cache identity: the monitor can still store an empty blocked-state payload under the final key on first render. Reopening to key the cache by readiness state as well, so the client transitions onto a fresh fetchable key when the monitor becomes ready.

Applied the missing cache-identity correction in `AccountHackathonAdminOperationsPanel.vue`: the submissions monitor async-data key now includes a `blocked` vs `ready` readiness segment, so an empty blocked-state payload from first render cannot be reused once the monitor becomes fetchable. Revalidated with `bun run lint`, `bun run typecheck`, and `bun run test:unit`.

User confirmed the submissions tab regression still persists after the readiness and cache-key fixes. Reopening the task to inspect the live browser/network behavior on the provided localhost URL before making any further code changes.

Live browser repro on April 17, 2026 showed the real failure mode: after a hard reload on `?tab=submissions`, the component entered a `ready` state but the async-data entry still held the SSR `blocked` payload with `teamDetails: []` and `teamSubmissions: []`. Manual `refreshSubmissionMonitor()` immediately loaded the correct rows, so the remaining gap was an incomplete-ready state rather than team-list readiness.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed the admin submissions tab so a hard reload on `?tab=submissions` now loads the real submission rows without requiring a tab switch. Live browser inspection showed the root cause was not missing team readiness by itself: after hydration, the submissions monitor could be `ready` while still holding an empty `success` payload inherited from the earlier blocked state, so the UI rendered every team as `No record` until something manually refreshed the monitor.

Implemented a deterministic completeness guard in `app/components/account/hackathons/AccountHackathonAdminOperationsPanel.vue`. When the submissions monitor is ready but its loaded data cannot satisfy the current team set, the panel now triggers the existing `refreshSubmissionMonitor()` once on the client. Added `shouldRefreshAdminSubmissionMonitor()` in `app/utils/admin-workspace.ts` to keep that rule explicit and testable, and covered it in `tests/unit/app/utils/admin-workspace.test.ts`.

Validated the fix in the live browser at `http://localhost:3000/account/hackathons/codex-vienna-2026-04-18-registration-today?tab=submissions`, where a hard reload now shows the submitted rows immediately. Validation also passed with `bun run lint`, `bun run typecheck`, and `bun run test:unit`.

Risk / follow-up: this guard intentionally refreshes only when the monitor is both ready and provably incomplete. If the submission monitor later moves to a different fetching strategy, this completeness rule should be kept aligned with the canonical requirement that each visible team has a matching detail and submission slot before the rows are trusted.
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
