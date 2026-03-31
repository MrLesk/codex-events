---
id: TASK-138
title: 'Require Auth0 update:users scope for account linking'
status: Done
assignee: []
created_date: '2026-03-31 19:47'
updated_date: '2026-03-31 20:26'
labels:
  - auth0
  - production
  - account-linking
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Production account linking reaches the Auth0 identity link request but fails on clean browsers and other devices. The current runtime linking flow posts to /api/v2/users/{primary}/identities, while the documented and validated Management API scopes only cover Auth0 bootstrap/custom-domain operations. Add repository guardrails so the required update:users scope is documented and validated before release, and improve runtime diagnostics for link failures.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Document that the Auth0 Management API machine-to-machine application used by runtime linking must include update:users.
- [x] #2 Fail Auth0 bootstrap or equivalent release-time validation when the configured Management API token lacks update:users.
- [x] #3 Preserve existing account-linking behavior while improving diagnostics for production link failures.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Documented and validated the runtime Auth0 Management API scope requirements for account linking. The runtime linking path now logs concrete link failures and rejects Management API tokens that lack update:users or read:users before attempting linking or linked-identity reconciliation. Tests cover the scope validation and link-failure diagnostics path. Follow up: production still requires a release on top of the current linked-identity fixes for the improved diagnostics to appear in worker logs.
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
