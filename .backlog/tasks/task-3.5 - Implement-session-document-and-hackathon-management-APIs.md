---
id: TASK-3.5
title: 'Implement session, document, and hackathon management APIs'
status: In Progress
assignee:
  - '@codex'
created_date: '2026-03-22 18:55'
updated_date: '2026-03-22 21:04'
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
- [ ] #3 Hackathon current application-terms and winner-terms references are enforced consistently with the canonical data model, including protection against invalid or cross-hackathon term references at the persistence layer.
- [ ] #4 Schema and migration changes required for this API area preserve the documented database invariants under the supported Drizzle workflow, and contributor guidance does not advertise a provisioning path that can silently drop required manual invariants.
- [ ] #5 Automated tests for this API area include unit and integration coverage plus Auth0-backed end-to-end scenarios for actor-facing flows, including session context, platform document acceptance, account deletion behavior, lifecycle guards, and admin-visible audit-relevant actions.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Implement the TASK-3.5 Nuxt server routes under `server/api` for the approved scope only: `session`, `platform-documents`, `platform-document-acceptances`, `account` deletion, `hackathons`, `roles`, `terms`, `evaluation-criteria`, and `prizes`, reusing the existing auth, DB, validation, error, lifecycle, and audit helpers.
2. Deliver the actor-facing platform endpoints first: `GET /api/session`, `GET /api/platform-documents/current`, `GET /api/platform-documents/:documentType/versions`, `POST /api/platform-document-acceptances`, and `DELETE /api/account`, enforcing exact-version platform-document acceptance and GDPR-capable account deletion with audit logging.
3. Before or alongside hackathon-terms APIs, correct the persistence layer so hackathon current application-terms and winner-terms references cannot point at nonexistent or wrong-hackathon terms documents.
4. Reconcile the migration/workflow gap exposed by schema review for this API area: if manual invariant migrations remain necessary, ensure the supported Drizzle workflow and contributor guidance do not allow those invariants to be skipped silently.
5. Deliver the hackathon administration endpoints next: hackathon list/detail/create/update, explicit role assignment list/create-replace/update/remove, hackathon terms current/version management, evaluation-criteria list/create/update, and prize list/create/update.
6. Enforce the approved task boundary: do not implement `POST /api/account/registration`, and do not implement judging-preparation, judge-review, shortlist, winner, or hackathon-completion endpoints whose downstream effects belong to TASK-3.7 or TASK-3.8.
7. Add focused unit tests for exact-version acceptance, role and judge-pool invariants, hackathon schedule/configuration guards, current-terms relational guarantees, and account-deletion behavior.
8. Add integration tests for route response shapes, authorization enforcement, persistence, audit-relevant writes, and the migration/invariant path used by contributors.
9. Add Auth0-backed BDD scenarios for session/context, platform document acceptance, account deletion, and admin management flows through the finalized TASK-3.4 persona/session harness where operator secrets and tenant access permit.
10. Update canonical or developer-facing docs only if the implemented behavior or setup changes require it; otherwise confirm docs remain unchanged during finalization.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Supervisor-approved scope for TASK-3.5 remains: implement only the session, platform-documents, platform-document-acceptances, account deletion, hackathons, roles, terms, evaluation-criteria, and prizes API area. Do not implement `/api/account/registration`, judging-preparation, judge-review, shortlist, winner, or completion endpoints in this task.

Current-state note: route work for the TASK-3.5 API surface already exists in `server/api`, but TASK-3.5 should not be treated as finalized or unblocked by stale notes. Live actor-facing validation for this task must use the BDD-authored Auth0/session harness under `tests/bdd` once TASK-3.4 is actually finalized.

Schema-review findings folded into TASK-3.5 remain in scope: hackathon current application-terms and winner-terms references need relational protection at the persistence layer, and the supported Drizzle workflow for this API area must not silently bypass required manual invariants.

Stale references to `tests/e2e`, missing `AUTH0_TEST_CONNECTION_NAME`, or TASK-3.4 already being complete are no longer current and should be ignored.
<!-- SECTION:NOTES:END -->

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
