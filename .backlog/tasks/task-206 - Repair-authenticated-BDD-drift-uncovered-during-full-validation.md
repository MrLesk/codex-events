---
id: TASK-206
title: Repair authenticated BDD drift uncovered during full validation
status: Done
assignee:
  - '@Codex'
created_date: '2026-04-13 09:55'
updated_date: '2026-04-13 10:17'
labels:
  - bdd
  - tests
  - authenticated
dependencies: []
references:
  - TASK-205
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/api-surface.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Bring the authenticated BDD suite back in sync with the current account/admin workspace UI and fixture behavior after the configurable judging rollout exposed stale selectors, stale copy assertions, and cross-scenario fixture contamination in non-judging flows.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Authenticated admin operations BDD steps reflect the current participant review UI labels and successfully exercise submitted approved and rejected application flows
- [x] #2 Authenticated participant submission BDD scenarios assert the current submission panel behavior for draft editing and locked read-only states without relying on stale visible-text expectations
- [x] #3 Authenticated participant team workspace BDD scenarios are deterministic across the full suite using current selectors and fixture reset behavior where needed
- [x] #4 The full `bun run test:bdd` suite passes locally
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update authenticated admin operations BDD steps to follow the current participant review UI labels and controls in `tests/bdd/steps/admin-operations.steps.ts`.
2. Refresh authenticated participant submission assertions in `tests/bdd/steps/team-submission.steps.ts` and, only if required for clarity, the matching feature text in `tests/bdd/features/authenticated/team-submission.feature` so they verify current input values and locked-state messaging instead of stale visible text.
3. Add deterministic reset coverage for participant team workspace fixtures in `tests/bdd/support/platform-fixtures.ts`, then update `tests/bdd/steps/team-workspace.steps.ts` and any matching feature text to use current selectors and stable scenario setup.
4. Run targeted authenticated BDD slices for admin operations, team submission, and team workspace while iterating, then run the full `bun run test:bdd` suite and finalize the task with the exact validation set.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Repaired the authenticated BDD drift uncovered during full validation. Admin operations steps now follow the current participant review UI labels, participant submission scenarios assert live form values and locked read-only behavior instead of stale visible text, and participant team workspace scenarios now match the current no-team and solo/team creation flows while using targeted fixture reset helpers to stay deterministic across the full suite. Canonical docs were confirmed unchanged because this task only refreshed automated coverage and fixture setup. Validation passed with `bun run lint`, `bun run typecheck`, `bun run test:unit`, `bun x vitest run tests/unit/support/bdd/platform-fixtures.test.ts`, and the full `bun run test:bdd` suite. No remaining BDD gap was identified for this task.
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
