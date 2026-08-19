---
id: TASK-432.3
title: Bound the authenticated request actor hot path
status: To Do
assignee:
  - '@luna-auth'
created_date: '2026-08-19 06:22'
updated_date: '2026-08-19 06:22'
labels: []
dependencies:
  - TASK-432.1
references:
  - server/auth/actor.ts
  - server/domains/accounts/auth-identities.ts
  - server/domains/platform/documents.ts
parent_task_id: TASK-432
priority: high
type: enhancement
ordinal: 130000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refactor request actor construction so authenticated endpoints do not repeat identity maintenance and an unbounded sequence of D1 reads. Keep canonical authorization and legal-document enforcement server-side.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Linked Auth0 identity reconciliation occurs only in account-link or login lifecycle work, never on every API read
- [ ] #2 Established platform-user actor resolution has a documented bounded D1 query path
- [ ] #3 The session/bootstrap response includes the actor capabilities required by account navigation without exposing internal authorization mechanics
- [ ] #4 Mutating endpoints still authorize against canonical platform and event data
- [ ] #5 Unit and integration tests assert actor behavior, consent gating, linked identities, and query-path boundaries
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
