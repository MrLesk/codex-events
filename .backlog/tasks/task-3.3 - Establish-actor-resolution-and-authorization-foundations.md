---
id: TASK-3.3
title: Establish actor resolution and authorization foundations
status: Done
assignee:
  - '@task-3.3-worker'
created_date: '2026-03-22 18:55'
updated_date: '2026-03-22 19:45'
labels:
  - backend
  - api
  - auth
milestone: m-0
dependencies:
  - TASK-3.1
documentation:
  - docs/domain-model.md
  - docs/permissions-matrix.md
  - docs/testing-strategy.md
  - docs/tech-stack.md
parent_task_id: TASK-3
priority: high
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the shared actor and authorization model for backend requests. The backend must resolve authenticated platform users from Auth0 identity, apply platform and hackathon permissions from application data, and preserve blind-judging visibility rules across the API-first backend surface.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Authenticated backend requests resolve platform actors from Auth0 identity without moving product authorization into Auth0.
- [x] #2 Shared authorization rules support platform admins, hackathon roles, team roles, and blind judging visibility as documented in docs/.
- [x] #3 The resulting actor and authorization foundations enforce consistent permission behavior across the documented backend API surface.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Clean the task record and keep the plan-of-record self-contained before implementation begins.
2. Add a shared actor-resolution layer that reads the Auth0-backed session, extracts the Auth0 subject, resolves the platform `User` by `auth0_subject`, and distinguishes unauthenticated, authenticated-without-platform-account, and authenticated-platform-user states.
3. Introduce a normalized backend actor shape and attach it to request context so server-side code can reuse one actor model.
4. Add reusable authorization primitives that cover platform-admin inheritance, hackathon-role checks, team-role checks, and judge-assignment blind-review context without implementing endpoint-specific policy logic.
5. Make blind judging explicit in the shared authorization layer so admins acting through a `JudgeAssignment` are forced onto blind-view behavior.
6. Add focused unit tests for actor resolution and authorization primitives only.
7. Validate the task with the relevant checks and finalize only after the task record reflects the actual implementation.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Supervisor-approved plan recorded before implementation. Scope is limited to actor resolution, normalized actor shape, request-context attachment, reusable authorization primitives, and blind-judging context handling. Route handlers, endpoint-specific business policy logic, and persona/session harness work are explicitly out of scope.

Implemented a shared auth foundation under `server/auth` with a cached request-actor resolver, normalized actor union, reusable hackathon/team/judge-assignment authorization helpers, and blind-review-aware guard helpers.

Extended `H3EventContext` so request-scoped actor resolution can be cached on the event without adding route-handler-specific policy or a persona/session harness.

Added focused unit coverage for anonymous, authenticated-without-platform-account, and platform-user actor resolution, plus platform-admin inheritance, explicit judge role handling, team-admin checks, and blind judge-assignment access behavior.

Validation passed with `bun run test:unit`, `bun run typecheck`, and `bun run lint`.

Current worker verification pass found the TASK-3.3 auth foundation already present in the workspace under `server/auth`, `server/types`, and `tests/unit/server/auth`. Revalidated the task-owned implementation against the current TASK-3.2 seams: `bun run test:unit tests/unit/server/auth/actor.test.ts tests/unit/server/auth/authorization.test.ts`, `bun run typecheck`, and `bun run lint` all passed. No additional in-scope code changes were required or made in this pass.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Established the shared actor-resolution and authorization foundation for the backend under `server/auth`. The new layer resolves the current request actor from the Auth0-backed session and `auth0_subject`, distinguishes anonymous, authenticated-without-platform-account, and platform-user states, and exposes reusable authorization helpers for hackathon roles, team roles, and blind judge-assignment access without implementing endpoint-specific business policy.

The implementation also attaches the normalized request actor to `H3EventContext` for request-scoped reuse and adds focused unit coverage for actor resolution, platform-admin inheritance, explicit judge access, team-admin checks, and blind-review enforcement when admins act through a `JudgeAssignment`.

Validation completed with `bun run test:unit`, `bun run typecheck`, and `bun run lint`. Canonical docs were confirmed unchanged for this task because the implementation matched the documented Auth0 identity boundary and authorization model without requiring spec changes.
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
