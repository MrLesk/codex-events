---
id: TASK-432.3
title: Bound the authenticated request actor hot path
status: Done
assignee:
  - '@luna-auth'
created_date: '2026-08-19 06:22'
updated_date: '2026-08-19 17:45'
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
- [x] #1 Linked Auth0 identity reconciliation occurs only in account-link or login lifecycle work, never on every API read
- [x] #2 Established platform-user actor resolution has a documented bounded D1 query path
- [x] #3 The session/bootstrap response includes the actor capabilities required by account navigation without exposing internal authorization mechanics
- [x] #4 Mutating endpoints still authorize against canonical platform and event data
- [x] #5 Unit and integration tests assert actor behavior, consent gating, linked identities, and query-path boundaries
- [x] #6 The validated account-link completion lifecycle persists every linked Auth0 subject in canonical user_auth_identities before a secondary identity can resolve the platform account
- [x] #7 Actor, consent, and permission reads explicitly use strong D1 consistency while reusing the request-scoped session
- [x] #8 First-platform-admin promotion occurs only in registration or setup lifecycle work and never during an ordinary actor read
- [x] #9 Fake-D1 query instrumentation enforces the bounded identity and consent read path
<!-- AC:END -->

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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Preserve the joined identity/user read and bounded consent reads from the existing commit.
2. Persist validated linked subjects in the explicit account-link completion lifecycle and update its canonical API note.
3. Make actor construction start or reuse a strong request-scoped D1 session.
4. Move first-platform-admin promotion out of ordinary actor resolution into registration/setup lifecycle code.
5. Add fake-D1 query instrumentation and lifecycle tests for linked identities, strong consistency, consent, and first-admin setup.
6. Run local lint, typecheck, unit, integration, and relevant BDD validation; finalize and commit without pushing.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Corrective implementation completed. Actor resolution keeps the joined user_auth_identities-to-active-users lookup and bounded fixed-document consent reads, but now starts strong D1 consistency and reuses the request-scoped session for actor, consent, session roles, and authorization reads. Account-link completion validates the existing primary subject and persists both primary and secondary Auth0 subjects in user_auth_identities before returning the signed Auth0 continuation. First-platform-admin promotion remains in registration/setup only; ordinary actor reads are read-only. Fake-D1 now records session IDs, session starts, SQL, bound parameters, writes, and served versions.

Verification evidence: actor-hot-path integration tests cover one first-primary session, one joined identity read, fixed consent cardinality, permission-session reuse, linked-subject persistence and secondary resolution, and first-admin registration. Auth0 account-link route unit tests cover the completion continuation. Full lint, typecheck, unit (129 files / 942 tests), focused Auth0 and actor integration tests, and full integration (31 files / 397 tests) pass. Local BDD was attempted with an isolated state directory but could not start because another worker already owns the repository Nuxt dev lock (PID 18761 on localhost:3100); no remote host or database was contacted.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Corrected TASK-432.3 structural regressions: durable linked-identity persistence now occurs in account-link completion, actor/consent/permission reads use one strong request-scoped D1 session, first-admin promotion is confined to registration/setup, and fake-D1 topology instrumentation enforces bounded reads. Verified with full lint, typecheck, 942 unit tests, 397 integration tests, and focused Auth0/link tests; local BDD startup remained blocked by another worker's Nuxt lock.
<!-- SECTION:FINAL_SUMMARY:END -->
