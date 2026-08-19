---
id: TASK-432.2
title: Build the shared account bootstrap and static authenticated shell
status: To Do
assignee:
  - '@luna-session'
created_date: '2026-08-19 06:22'
updated_date: '2026-08-19 06:22'
labels: []
dependencies:
  - TASK-432.1
references:
  - app/domains/accounts/navigation-guards.ts
  - app/composables/useSessionActor.ts
  - nuxt.config.ts
parent_task_id: TASK-432
priority: high
type: enhancement
ordinal: 129000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Serve account and admin routes as an immediate Nuxt client shell while preserving Auth0 server-side API security. Replace route-local session calls with one shared actor/bootstrap client and one source of truth for account navigation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Account, admin, and prize-redemption navigations do not block document rendering on D1-backed SSR data
- [ ] #2 Route guards and account features consume one shared typed bootstrap state and do not issue duplicate session requests
- [ ] #3 Auth0 session and all authorization decisions remain enforced by server APIs
- [ ] #4 Query-only event-tab navigation does not refresh actor state
- [ ] #5 Unit and local browser tests cover anonymous redirects, authenticated navigation, consent gating, and bootstrap deduplication
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
