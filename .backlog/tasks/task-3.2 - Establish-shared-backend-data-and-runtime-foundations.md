---
id: TASK-3.2
title: Establish shared backend data and runtime foundations
status: Done
assignee:
  - '@codex'
created_date: '2026-03-22 18:55'
updated_date: '2026-03-22 19:37'
labels:
  - backend
  - api
  - foundation
milestone: m-0
dependencies:
  - TASK-3.1
documentation:
  - docs/schema-outline.md
  - docs/lifecycle-and-state-machines.md
  - docs/tech-stack.md
  - docs/testing-strategy.md
parent_task_id: TASK-3
priority: high
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the shared backend foundations that the API-first program will rely on. This task covers the canonical persistent model, shared backend request handling patterns, validation boundaries, deletion-capable data handling, and audit-capable operational foundations so the backend is built on one consistent server-side base.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The backend foundation supports the canonical entities, enums, constraints, exact-version acceptance records, and deletion semantics required by the schema and lifecycle docs.
- [x] #2 Shared backend request handling, validation, error, and audit foundations are available for the API-first backend surface.
- [x] #3 The resulting foundation supports implementation of the documented platform workflows without redefining core backend behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Map `docs/schema-outline.md` into the concrete shared persistence layer: Drizzle schema files, D1-compatible enums and constraints representation, exact-version document-acceptance tables, soft-delete-capable `User` handling, and the minimum indexes and uniqueness guarantees required by the canonical backend API surface.
2. Add the shared database runtime entry points for Nuxt/Nitro requests: request-scoped DB access, transaction helpers, and one consistent location for persistence utilities so the backend uses one data-access pattern.
3. Establish shared server-side validation and response foundations that match `docs/api-surface.md`: request parsing boundaries, stable JSON error envelope, success envelope conventions, and reusable guard and error helpers for lifecycle-sensitive operations.
4. Establish shared audit foundations for sensitive actions: canonical audit-log write helper(s), metadata shape conventions, and integration points for audit recording within the backend foundation.
5. Add foundational tests for the shared layer itself: schema and runtime smoke coverage, constraint-sensitive persistence checks, validation and error-shape coverage, and audit helper coverage.
6. Update contributor-facing documentation only if this task materially changes setup or validation commands; otherwise confirm canonical docs remain unchanged.
7. Before finalization, verify the resulting foundation still matches `docs/api-surface.md`, `docs/schema-outline.md`, `docs/lifecycle-and-state-machines.md`, and `docs/tech-stack.md`, then implement within this task only.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Reset status after audit: the previously recorded draft plan was unapproved and included forward-looking references. A fresh supervisor-approved planning pass is required before implementation starts. No implementation has started.

Stale implementation-plan text was cleared during the current planning pass so TASK-3.2 remains in an unapproved state pending supervisor review. No code changes have been made for TASK-3.2.

Supervisor re-recorded the approved implementation plan after a later worker incorrectly reverted the task to pending approval. Implementation remains blocked until a stable implementation worker is attached.

Supervisor approved the TASK-3.2 implementation plan with explicit scope boundaries: persistence and DB/runtime access, validation/error primitives, audit primitives, and the Auth0-subject doc fix only.

Foundation-local tests are in scope for this task; persona or session harness work is explicitly out of scope.

Reviewed the approved TASK-3.2 plan, required canonical docs, and current worktree state. Discovery found uncommitted backend-foundation files already present under `server/database`, `server/utils`, `drizzle/`, and `tests/unit`; implementation will continue by validating and extending those files in place rather than reverting shared work.

Updated the plan of record to the supervisor-approved TASK-3.2 scope and reassigned the task to @codex before final validation/finalization.

Implementation delivered the shared D1/Drizzle persistence baseline, request-scoped database access, validation and response helpers, audit logging helpers, generated migrations, and focused unit coverage without absorbing actor resolution, authorization policy, or Auth0 persona harness ownership.

Validation passed for TASK-3.2 with `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `git diff --check -- package.json nuxt.config.ts drizzle.config.ts drizzle server/database server/types server/utils tests/unit DEVELOPMENT.md`.

Boundary check remained clean: this task delivered shared persistence/runtime/audit/validation substrate only and did not absorb actor resolution, authorization policy, or the broader Auth0 persona test harness.

Reopened after supervisor validation found `bun run test:unit` failing in the current worktree. Corrective work is limited to TASK-3.2 foundation scope and recorded validation must be re-established before finalization.

Refreshed `drizzle/0000_pretty_rachel_grey.sql` and Drizzle metadata from the live `server/database/schema.ts`, then re-applied the task-owned `team_members` trigger guards so the migration matches the canonical shared foundation while preserving required membership invariants. Updated `tests/unit/server/database/migration.test.ts` fixtures to insert stable `auth0_subject` values and added migration coverage for active-user `auth0_subject` uniqueness. Validation: `bun run test:unit` now passes (7 files, 20 tests).

Final validation for TASK-3.2 passed in the current worktree: `bun run lint` and `bun run typecheck` both succeeded after the migration/schema and fixture alignment fixes.

Corrected the shared migration chain after supervisor validation found the recorded result overstated the current worktree state. The migration test now applies the full `drizzle/*.sql` chain, seeds the required `auth0_subject`, and validates the documented team-membership invariants against the actual persisted schema.

Supervisor cleanup: removed forward-looking wording from the recorded TASK-3.2 plan so the task record stays self-contained.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Established the shared backend foundation for the API-first backend: the canonical Drizzle/D1 schema and migration output, request-scoped database access and transaction helpers, stable API error/response/validation helpers, and reusable audit-log persistence helpers are in place under `server/database` and `server/utils`. The canonical Auth0-subject mismatch was resolved by updating the `User` schema outline to include `auth0_subject` as the persisted identity key used to resolve the platform actor, while preserving soft-delete semantics for GDPR-capable account handling.

A corrective pass reopened the task after supervisor validation found the migration suite failing in the current worktree. The fix updated the migration test to execute the full `drizzle/*.sql` chain, seeded the required `auth0_subject` values, and corrected the migration sequence by retiring the older team-member triggers before table rebuilds and recreating the canonical trigger set afterward. The persisted foundation now enforces the documented team invariants that belong in this layer: one active team membership per user per hackathon, one active membership per `(team_id, user_id)`, every active team retaining an active admin, and the post-submission-close requirement that a team still retain at least one active member.

Validation completed with `bun run test:unit`, `bun run typecheck`, and `bun run db:generate`. Contributor-facing setup docs remain updated for the D1 binding and Drizzle/Vitest commands. Scope stayed within persistence, DB/runtime access, validation/error primitives, audit primitives, migration enforcement, and the canonical doc fix; no actor-resolution policy, authorization policy, or persona/session harness work was added.

Risk/follow-up: the cross-table team invariants are enforced in the migration layer with SQLite triggers because Drizzle's TypeScript schema surface does not express those constraints directly. Future table-rebuild migrations that touch `team_members`, `teams`, or `hackathons` must preserve or recreate those triggers as part of the migration chain.
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
