---
id: TASK-423
title: Replace Auth0 test personas with local sessions
status: In Progress
assignee:
  - '@codex'
created_date: '2026-07-28 21:39'
updated_date: '2026-07-28 21:40'
labels: []
dependencies: []
documentation:
  - docs/testing-strategy.md
  - DEVELOPMENT.md
  - docs/superpowers/specs/2026-07-28-local-test-personas-design.md
priority: high
type: task
ordinal: 110000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
BDD and the local load runner use fixed local email sessions and D1-owned roles, so contributors and CI can exercise multiple actor types without Auth0 tenants, credentials, passwords, or browser login automation. Production authentication remains Auth0.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `bun run test:bdd` runs from a clean environment without Auth0 or E2E persona settings
- [ ] #2 BDD covers platform-admin, event-admin, judge, and regular-user behavior through fixed local sessions whose permissions come only from D1 fixtures
- [ ] #3 The local load runner uses the same Auth0-free persona sessions
- [ ] #4 BDD CI no longer requires or conditionally checks Auth0 credentials and persona secrets
- [ ] #5 Production Auth0 configuration and behavior remain unchanged
- [ ] #6 Canonical testing documentation, contributor instructions, examples, features, and automated tests describe the local persona model
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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Record and review the approved local-persona design. 2. Write the detailed implementation plan. 3. Replace Auth0 persona provisioning and login automation with fixed local session artifacts shared by BDD and load testing. 4. Remove BDD Auth0 configuration from CI and documentation. 5. Run the full validation and both BDD/load smoke workflows.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Approved design recorded for fixed local email sessions shared by BDD and load testing; production Auth0 remains unchanged.
<!-- SECTION:NOTES:END -->
