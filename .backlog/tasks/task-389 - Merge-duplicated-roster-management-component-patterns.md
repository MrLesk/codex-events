---
id: TASK-389
title: Merge duplicated roster management component patterns
status: Done
assignee:
  - Codex
created_date: '2026-06-13 14:56'
updated_date: '2026-06-13 15:04'
labels:
  - client
  - refactor
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
parent_task_id:
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Reduce repeated roster-management candidate search, pagination, row rendering, pending-action, and role-mutation patterns across account roster panels while preserving existing product behavior, permissions, API contracts, and user-facing copy.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Shared candidate search and pagination state is extracted into a small helper or composable used by the relevant roster panels.
- [x] #2 Shared roster row presentation is extracted only where it materially reduces duplicated markup without hiding role-specific business rules.
- [x] #3 Platform admin, event organizer, event role assignment, and published roster management remain thin role-specific wrappers where behavior differs.
- [x] #4 Existing user-facing copy, permissions, role semantics, and API contracts are preserved without compatibility fallbacks.
- [x] #5 Required validation passes: bun run lint, bun run typecheck, and bun run test:unit.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Compare the four account roster panels and existing role-roster composable/domain helpers to identify the smallest shared extraction boundary.
2. Extract candidate search and pagination state into a focused composable or helper.
3. Extract shared roster row UI only if the resulting component keeps role-specific actions explicit.
4. Update the role-specific roster panels to use the shared pieces while preserving existing labels, empty states, and mutation behavior.
5. Run required validation and record the final summary, risks, and task completion state.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Extracted repeated roster candidate lookup behavior into `useRosterCandidateSearch`, including debounced search, reset-key handling, initial load, pagination, duplicate-page merging, stale-request protection, and candidate error state. Extracted repeated mutation pending/error/toast handling into `useRosterMutationRunner`.

Added shared account roster row and skeleton presentation components for repeated roster-management user rows while keeping all role badges, labels, disabled states, and actions in the role-specific panels. Updated the platform admin, event organizer, event role assignment, and published-roster management panels to use the shared pieces without changing API paths, role semantics, permissions, or user-facing copy.

Canonical docs are unchanged because this is an internal client refactor. Validation passed: `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `git diff --check`. Integration and BDD suites were not run because the change did not touch server integrations, Auth0-backed flows, or browser workflow behavior.

Residual risk: this reduces duplicated Vue markup and state management but remains covered primarily by typecheck and existing unit coverage rather than component-level visual tests.
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
