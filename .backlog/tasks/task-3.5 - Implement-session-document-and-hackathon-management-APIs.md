---
id: TASK-3.5
title: 'Implement session, document, and hackathon management APIs'
status: To Do
assignee: []
created_date: '2026-03-22 18:55'
updated_date: '2026-03-22 19:00'
labels:
  - backend
  - api
  - hackathons
milestone: m-0
dependencies:
  - TASK-3.1
  - TASK-3.2
  - TASK-3.3
  - TASK-3.4
documentation:
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/permissions-matrix.md
  - docs/schema-outline.md
parent_task_id: TASK-3
priority: high
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the backend APIs that expose actor context and support platform-level and hackathon-level administration. This includes the authenticated actor view, platform document read and exact-version acceptance flows, platform account deletion, hackathon management, role assignment, criteria, prizes, terms references, and lifecycle actions required by the canonical docs.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Authenticated users can retrieve their platform actor context, complete platform document acceptance against the exact document version where required, and request GDPR-compliant account deletion through API.
- [ ] #2 Admins can manage hackathons and their related administrative configuration according to the documented fields, permissions, and lifecycle rules.
- [ ] #3 Automated tests for this API area include unit and integration coverage plus Auth0-backed end-to-end scenarios for actor-facing flows, including session context, platform document acceptance, account deletion behavior, lifecycle guards, and admin-visible audit-relevant actions.
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
