---
id: TASK-252
title: Exclude dissolved teams from the admin submissions dashboard
status: Done
assignee:
  - '@codex'
created_date: '2026-04-17 16:37'
updated_date: '2026-04-17 16:39'
labels: []
dependencies: []
documentation:
  - app/components/account/hackathons/AccountHackathonAdminOperationsPanel.vue
  - app/components/admin/AdminTeamsOperationsPanel.vue
  - app/utils/admin-workspace.ts
  - docs/api-surface.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The admin submissions tab still builds its dashboard metrics and team lists from the full operational team set, which causes dissolved teams with zero active members to inflate the total-team count and related filter counts. Update the submissions dashboard so it consistently uses only active operational teams while leaving the dedicated Teams tab unchanged for dissolved-team visibility.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The admin submissions dashboard excludes dissolved teams from its total-team summary and filter counts.
- [x] #2 The admin submissions dashboard team lists and intervention surface no longer include dissolved teams with zero active members.
- [x] #3 The dedicated Teams tab continues to preserve dissolved-team visibility for admin and staff users.
- [x] #4 Automated coverage is updated for the active-team submissions-dashboard behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Derive an active-only submissions dashboard team collection from the existing admin operational teams so dissolved teams are removed consistently from summary cards, filter counts, and submissions lists.
2. Update the admin submissions section to feed the active-only collection into the interventions panel, searchable team list, and dashboard metrics while leaving the Teams tab routing and API visibility rules unchanged.
3. Extend unit coverage for the active-only submissions dashboard behavior and run bun run lint, bun run typecheck, and bun run test:unit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Confirmed docs remain unchanged: docs/api-surface.md already scopes dissolved-team visibility to the Teams API surfaces for staff/admin operational context, so the submissions dashboard can use an active-only operational team set without changing canonical behavior.

Added a reusable helper that filters admin operational teams to those with active members and wired the submissions section to use that active-only collection for summary metrics, filter counts, searchable rows, and the intervention panel.

Kept the dedicated Teams tab unchanged so staff/admin users still see dissolved teams there via the existing API visibility rules.

Extended unit coverage for the active-team submissions dashboard behavior and reran bun run lint, bun run typecheck, and bun run test:unit successfully.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated the admin submissions dashboard to exclude dissolved teams with zero active members from its operational team set. The submissions tab now derives an active-only collection before building summary cards, filter counts, searchable submission rows, and the intervention surface, so totals in that tab align with active teams rather than retained dissolved history.

Added focused unit coverage in `tests/unit/app/utils/admin-workspace.test.ts` for the active-team filtering path and its downstream dashboard metrics. Canonical docs already matched the intended behavior, so no docs changes were required. Validation passed with `bun run lint`, `bun run typecheck`, and `bun run test:unit`.

Risk / follow-up: if a future admin workflow needs dissolved-team submission history inside the submissions tab, that should be introduced as an explicit archived/dissolved filter instead of mixing dissolved teams into the default operational counts again.
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
