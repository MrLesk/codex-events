---
id: TASK-250
title: Exclude dissolved teams from admin submission progress metrics
status: Done
assignee:
  - '@codex'
created_date: '2026-04-17 16:29'
updated_date: '2026-04-17 16:36'
labels: []
dependencies: []
documentation:
  - app/components/account/hackathons/AccountHackathonAdminOperationsPanel.vue
  - app/utils/admin-workspace.ts
  - docs/domain-model.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The admin operations tab currently counts dissolved teams in the `Submissions Sent` denominator, which makes the submission progress summary disagree with the active team list. Update the operations summary so dissolved teams do not count toward submission progress while preserving existing dissolved-team visibility in admin/staff team views.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The admin operations `Submissions Sent` metric excludes dissolved teams from its total team denominator.
- [x] #2 Active submitted-team counts continue to reflect only teams with submitted or locked work.
- [x] #3 Admin and staff team views continue to preserve dissolved-team visibility for operational context.
- [x] #4 Automated coverage is updated for the adjusted submission progress metric.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a small helper in the admin workspace utilities for counting active operational teams so dissolved teams are excluded consistently from admin submission progress math.
2. Update the admin operations panel to build the `Submissions Sent` value from active teams only while preserving the existing team-list and dissolved-visibility behavior elsewhere.
3. Extend unit coverage for the new metric behavior and run bun run lint, bun run typecheck, and bun run test:unit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Confirmed docs remain unchanged: docs/domain-model.md and docs/api-surface.md already define dissolved teams as retained for auditability while participant-facing team reads exclude them and staff/admin reads may include them for operational context.

Implemented a dedicated active-team denominator for the admin operations submission progress summary by counting only operational teams with active members.

Kept the submitted-team count logic unchanged so submitted or locked work still drives the numerator while dissolved teams remain visible in operational team surfaces elsewhere.

Added focused unit coverage for the active-team denominator helper and reran bun run lint, bun run typecheck, and bun run test:unit successfully.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated the admin operations `Submissions Sent` summary to exclude dissolved teams from the denominator while leaving submitted-team counting and operational team visibility behavior intact. The operations panel now derives its denominator from operational teams with at least one active member, which fixes cases where withdrawn dissolved teams inflated the total team count.

Added unit coverage in `tests/unit/app/utils/admin-workspace.test.ts` for the new active-team denominator helper. Canonical docs already matched the intended behavior, so no docs changes were required. Validation passed with `bun run lint`, `bun run typecheck`, and `bun run test:unit`.

Risk / follow-up: the metric intentionally differs from raw team totals whenever dissolved teams are retained for auditability, so future operational summaries should choose explicitly between active-team and all-team counts instead of reusing raw team totals by default.
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
