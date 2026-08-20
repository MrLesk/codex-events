---
id: TASK-432.3
title: Bound the authenticated request actor hot path
status: Done
assignee:
  - '@luna-auth'
created_date: '2026-08-19 06:22'
updated_date: '2026-08-20 21:47'
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
- [x] #10 Ordinary request actor resolution performs no Auth0 /userinfo, Management API, access-token acquisition, or other external network operation and uses only validated session claims plus strong request-scoped D1.
- [x] #11 A focused negative test fails if an unverified or missing-email session with an unpersisted subject attempts fetch or access-token acquisition during ordinary actor resolution.
- [x] #12 The real /auth/link/complete route is integration-tested with request-scoped strong D1 and persists both validated Auth0 subjects before returning the Auth0 continuation.
- [x] #13 Link completion is idempotently retryable after D1 persistence and before Auth0 Action completion; ordinary reads never reconcile or repair linked identities.
- [x] #14 Identity persistence is exposed through an explicit account-link lifecycle boundary rather than an attractive generic ordinary-read helper.
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
1. Remove the ordinary actor-resolution Auth0 /userinfo and access-token refresh path, including dead helpers/imports, while preserving validated session claims and strong request-scoped D1 reads.
2. Add a negative actor-resolution test proving unverified or missing email claims with an unknown subject never fetch or acquire a token.
3. Add route-level integration coverage for the real /auth/link/complete handler, asserting both validated subjects persist through the request-scoped strong D1 session.
4. Verify and document idempotent retry semantics for D1-before-Auth0-link completion; keep reconciliation confined to explicit lifecycle routes.
5. Tighten the identity persistence module boundary so ordinary reads do not depend on a generic write helper.
6. Run lint, typecheck, unit, integration, and focused BDD only when the local port is available; commit scoped files only.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Corrective implementation completed. Actor resolution keeps the joined user_auth_identities-to-active-users lookup and bounded fixed-document consent reads, but now starts strong D1 consistency and reuses the request-scoped session for actor, consent, session roles, and authorization reads. Account-link completion validates the existing primary subject and persists both primary and secondary Auth0 subjects in user_auth_identities before returning the signed Auth0 continuation. First-platform-admin promotion remains in registration/setup only; ordinary actor reads are read-only. Fake-D1 now records session IDs, session starts, SQL, bound parameters, writes, and served versions.

Verification evidence: actor-hot-path integration tests cover one first-primary session, one joined identity read, fixed consent cardinality, permission-session reuse, linked-subject persistence and secondary resolution, and first-admin registration. Auth0 account-link route unit tests cover the completion continuation. Full lint, typecheck, unit (129 files / 942 tests), focused Auth0 and actor integration tests, and full integration (31 files / 397 tests) pass. Local BDD was attempted with an isolated state directory but could not start because another worker already owns the repository Nuxt dev lock (PID 18761 on localhost:3100); no remote host or database was contacted.

Correction scope reopened after review: remove the remaining Auth0 userinfo hot path, add negative no-network coverage, and test the real link-completion route with durable persistence. Preserve 14ad8b77, 0d7d908f, and 227e96ea; do not touch Poincare-owned bootstrap/client conversion files or D1 session files unless a test requires it.

Correction validation: ordinary actor resolution no longer contains Auth0 /userinfo, access-token, or fetch code; the focused actor unit cases cover false and missing email_verified claims with an unpersisted subject and assert no token/fetch calls. The real /auth/link/complete integration route persists the primary and secondary subjects through two first-primary request sessions and succeeds on a repeated completion without duplicate identities. Full gates pass: lint, typecheck, unit 129 files / 944 tests, integration 32 files / 398 tests, plus focused actor/link unit and integration tests. Focused authenticated BDD fixture bootstrap and bddgen succeeded, but Playwright could not start because another Nuxt process owns localhost:3100 (PID 50007); task remains In Progress pending browser validation. No remote database, deployment, or push.

Exact local candidate dfe6fb6d0c4f972b9a0040be71e6bcfe0501d483: MCP generators clean; bun run lint and bun run typecheck pass; unit 155 files/1047 tests; integration 40 files/455 tests; Cloudflare build pass; workflow topology 2/2; focused Chromium topology 22/22 with zero API, console, or page errors, usable timings about 171-655ms, Settings local editor with zero CDN requests, and one intentional cancellation abort; full BDD 85/85 and destructive BDD 2/2. No remote deployment, CI, test URL, CF-Cache-Status, or remote cache evidence exists. Independent review found no P0, P1, or P2; nonblocking P3: an invalid or denied entry-family tab query may remain in the URL after a 403/404 entry response, without a data leak.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Bounded actor resolution and account-link lifecycle behavior are complete at dfe6fb6d. Strong request-scoped actor, consent, and permission reads, no ordinary Auth0 network reconciliation, linked-identity persistence, and negative no-network coverage are validated by the final local lint/type/unit/integration/BDD gate. No remote evidence is claimed.
<!-- SECTION:FINAL_SUMMARY:END -->
