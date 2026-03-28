---
id: TASK-21.1
title: Align admin hackathon detail navigation and role-assignment tabs
status: In Progress
assignee:
  - '@codex'
created_date: '2026-03-28 23:41'
updated_date: '2026-03-28 23:46'
labels: []
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
parent_task_id: TASK-21
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the account-scoped hackathon detail surface so admins see consistent admin-dashboard selection in the shell sidebar whenever they are on a hackathon page that routes back to the admin dashboard. Move hackathon judge assignment controls into the existing Judges tab and move hackathon-admin assignment controls into the existing Staff tab so those role-management actions live on the pages that represent those rosters. Preserve the current permissions model: only platform admins and hackathon admins can manage these rosters, while non-admin viewers continue to see only the non-operational tab content.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 When a platform admin or hackathon admin is on an account-scoped hackathon detail page that links back to the admin dashboard, the shell sidebar highlights Admin dashboard rather than My hackathons
- [ ] #2 The Judges tab exposes judge assignment and removal controls only for platform admins and hackathon admins, and non-admin viewers do not see admin role-management actions there
- [ ] #3 The Staff tab exposes hackathon-admin assignment and removal controls only for platform admins and hackathon admins, and non-admin viewers do not see admin role-management actions there
- [ ] #4 Judge and hackathon-admin assignment controls are removed from the Settings and Operations surfaces so the roster-management entry points live only on the Judges and Staff tabs
- [ ] #5 Relevant unit coverage is updated for the sidebar active-state behavior and any affected role-management UI logic, and bun run test:unit is run locally
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Derive admin-access context for account-scoped hackathon detail routes from the existing `/api/account/hackathons` data so shell navigation can distinguish admin-accessible hackathon pages from participant-only pages.
2. Update shell navigation active-state logic so `/account/admin` stays selected for any admin-accessible account hackathon detail page, including non-operations tabs that still route back to the admin dashboard.
3. Extract a reusable hackathon role-roster management component and use it to render judge management in the Judges tab and hackathon-admin management in the Staff tab for admin-capable actors only.
4. Remove duplicate judge and hackathon-admin assignment controls from the Competition and Settings panels while preserving the rest of those surfaces.
5. Update unit tests for shell navigation and run `bun run test:unit`, then record validation and any gaps in the task.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Canonical docs were updated or confirmed unchanged
- [ ] #2 Code behavior matches canonical docs
- [ ] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [ ] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [ ] #7 Auth and permissions changes follow the documented platform model
- [ ] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
