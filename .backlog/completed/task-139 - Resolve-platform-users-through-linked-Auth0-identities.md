---
id: TASK-139
title: Resolve platform users through linked Auth0 identities
status: Done
assignee: []
created_date: '2026-03-31 20:11'
updated_date: '2026-03-31 20:26'
labels:
  - auth0
  - account-linking
  - schema
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Production account linking cannot be trusted to yield a single stable Auth0 subject across devices. The platform currently stores and resolves only one users.auth0_subject, which causes linked Google and password identities to behave as separate platform identities on different laptops. Introduce canonical linked Auth0 identities for platform users, migrate existing users, and update actor resolution and account-link writes so any linked Auth0 subject resolves to the same platform user.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Add a canonical persistent model for multiple linked Auth0 identities per platform user and update docs accordingly.
- [x] #2 Resolve authenticated platform actors through linked Auth0 identity records instead of only users.auth0_subject.
- [x] #3 Persist the secondary Auth0 subject after successful account linking and create the initial identity record during platform account registration.
- [x] #4 Preserve account deletion and registration invariants, with tests covering logins through both linked subjects.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added canonical linked Auth0 identities for platform users, including schema, migration backfill, actor resolution, account-link persistence, and documentation updates. Platform actors now resolve through user_auth_identities, and the server can reconcile already-linked Auth0 identities from Auth0 so cross-device Google and password logins land on the same platform user. Tests cover schema behavior, migration behavior, link completion, actor reconciliation, authorization mocks, and registration and deletion invariants. Follow up: deploy the migration and runtime together so existing production users can self-heal missing local identity rows on their next authenticated request.
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
