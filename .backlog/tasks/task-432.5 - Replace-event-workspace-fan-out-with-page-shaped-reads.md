---
id: TASK-432.5
title: Replace event workspace fan-out with page-shaped reads
status: To Do
assignee:
  - '@luna-workspace'
created_date: '2026-08-19 06:22'
updated_date: '2026-08-19 06:22'
labels: []
dependencies:
  - TASK-432.2
  - TASK-432.3
  - TASK-432.4
references:
  - 'app/pages/account/events/[slug]/index.vue'
  - app/composables/useAdminWorkspace.ts
  - app/components/account/events/AccountEventAdminOperationsPanel.vue
parent_task_id: TASK-432
priority: high
type: enhancement
ordinal: 132000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Give each event workspace tab one typed server-owned read model so a tab does not independently fetch session, event, role, and multiple domain resources. Preserve existing event behavior and atomic component boundaries.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Operations, submissions, settings, participants, staff, and other data-heavy tabs each have at most one critical page-data request after bootstrap
- [ ] #2 Each page-shaped route resolves authorization once and executes its D1 work through the shared request client
- [ ] #3 The event route component remains a composition surface and domain panels receive typed props and emit mutations
- [ ] #4 Tab changes cancel abandoned requests and do not allow stale responses to update the active view
- [ ] #5 Heavy editor code is locally bundled and loaded only for tabs that use it; runtime unpkg dependencies are removed
- [ ] #6 Unit, integration, and local browser tests verify response contracts, permissions, request counts, cancellation, and tab behavior
<!-- AC:END -->

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
