---
id: TASK-3.1
title: Define the canonical API surface for backend workflows
status: In Progress
assignee:
  - '@planner-3.1'
created_date: '2026-03-22 18:55'
updated_date: '2026-03-22 19:10'
labels:
  - backend
  - api
  - contracts
milestone: m-0
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/permissions-matrix.md
  - docs/schema-outline.md
  - docs/testing-strategy.md
parent_task_id: TASK-3
priority: high
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Document the backend API surface needed to fulfill the canonical product model before implementation begins. This task should translate the product docs into stable backend domains, operation boundaries, request and response conventions, visibility rules, lifecycle guards, deletion behavior, exact-version document acceptance requirements, derived read models, and validation expectations so later implementation tasks can proceed against a shared contract.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The planned API surface covers the canonical business domains described in docs/, including platform account deletion, versioned document acceptance flows, and the documented derived operational read models, without UI-specific behavior.
- [ ] #2 Each planned operation identifies the required actor, visibility rules, lifecycle or state guards, and exact-version document acceptance requirements that control access where applicable.
- [ ] #3 Shared backend conventions for request and response shape, error handling, filtering, pagination, and expected unit, integration, and Auth0-backed end-to-end coverage are documented for downstream implementation tasks.
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
