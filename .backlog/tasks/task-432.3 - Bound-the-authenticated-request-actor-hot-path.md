---
id: TASK-432.3
title: Bound the authenticated request actor hot path
status: Done
assignee:
  - '@luna-auth'
created_date: '2026-08-19 06:22'
updated_date: '2026-08-19 06:53'
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
1. Keep the canonical Auth0 login/account-link lifecycle as the owner of identity reconciliation; remove linked-identity writes and claim plumbing from ordinary request actor resolution while retaining canonical linked-identity reads.
2. Replace the sequential auth-identity then user lookup with one explicit joined D1 read for the active platform user, preserving request-context memoization and the existing first-admin promotion path.
3. Bound current platform-document resolution to the fixed platform document types and latest row per type, then preserve current-consent evaluation and mutation authorization semantics.
4. Update focused unit and local-D1 integration coverage for anonymous, authenticated, linked-identity, consent-blocked, first-admin, session-capability, actor memoization, and no-identity-maintenance-on-ordinary-read behavior.
5. Run targeted tests plus lint, typecheck, unit, and integration validation; inspect the scoped diff and commit only TASK-432.3 files and its Backlog task file.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implementation and verification completed:
- Ordinary request actor resolution now performs a read-only lookup: one indexed user_auth_identities-to-active-users join, with request-context memoization and first-admin promotion preserved. Auth0 account-link claim parsing and identity writes were removed from the ordinary actor path; existing linked identity rows remain resolvable.
- Current platform documents are resolved with one latest-row query per the two fixed document types, so consent evaluation has fixed query cardinality.
- Focused verification passed: bunx eslint on all TASK-432.3 source/tests; 26 focused unit tests; 13 selected local-D1 session/authorization integration tests.
- Repository-wide checks were run locally: lint, typecheck, full unit, full integration, and BDD. They remain non-green only on unrelated shared-worker changes (media style/cache expectations, app bootstrap/defineRouteRules, request-scoped database test, and BDD persona/browser setup). No remote database or test environment was used.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Bound the authenticated actor hot path by removing ordinary-request Auth0 identity reconciliation, using one joined active-user identity read, and bounding current-document reads to the fixed document types. Preserved linked identity lookup, consent, first-admin promotion, session capabilities, memoization, and canonical authorization. Focused lint/unit/local-D1 integration checks pass; broader shared-worktree checks are documented as blocked by unrelated worker changes.
<!-- SECTION:FINAL_SUMMARY:END -->
