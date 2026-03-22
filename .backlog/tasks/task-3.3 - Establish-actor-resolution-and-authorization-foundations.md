---
id: TASK-3.3
title: Establish actor resolution and authorization foundations
status: In Progress
assignee:
  - planner-3.3
created_date: '2026-03-22 18:55'
updated_date: '2026-03-22 19:09'
labels:
  - backend
  - api
  - auth
milestone: m-0
dependencies:
  - TASK-3.1
documentation:
  - docs/domain-model.md
  - docs/permissions-matrix.md
  - docs/testing-strategy.md
  - docs/tech-stack.md
parent_task_id: TASK-3
priority: high
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the shared actor and authorization model for backend requests. The backend must resolve authenticated platform users from Auth0 identity, apply platform and hackathon permissions from application data, and preserve blind-judging visibility rules across later domain APIs.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Authenticated backend requests resolve platform actors from Auth0 identity without moving product authorization into Auth0.
- [ ] #2 Shared authorization rules support platform admins, hackathon roles, team roles, and blind judging visibility as documented in docs/.
- [ ] #3 Later domain APIs can reuse the resulting actor and authorization foundations to enforce consistent permission behavior.
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
