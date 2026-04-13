---
id: TASK-205.5.2
title: Refresh BDD judging and outcomes fixtures for configurable judging
status: Done
assignee:
  - Codex
created_date: '2026-04-13 08:22'
updated_date: '2026-04-13 09:48'
labels:
  - judging
  - tests
  - bdd
dependencies:
  - TASK-205.3
  - TASK-205.4
references:
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/api-surface.md
parent_task_id: TASK-205.5
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update real-Auth0 BDD fixture data, steps, and features so the authenticated judging, judge workspace, and outcomes flows exercise the canonical configurable judging paths or document any remaining gaps explicitly.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 BDD platform fixtures encode the supported judging configurations including manual shortlist finalists and partial pitch participation when admins close pitch review early
- [x] #2 Authenticated BDD judging judge-workspace and outcomes scenarios reflect the canonical configurable judging workflow rather than blind-only or shortlist-reorder assumptions
- [x] #3 BDD validation passes locally for the updated scenarios or the remaining gap is documented directly in the task summary
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Refresh `tests/bdd/support/platform-fixtures.ts` so judging and outcomes fixtures seed canonical hackathon states, judging configuration, stage-aware `judge_assignments`, finalists, and pitch/final-deliberation data needed by the current runtime.
2. Update `tests/bdd/features/authenticated/judge-workspace.feature` and `tests/bdd/steps/judge-workspace.steps.ts` to assert the blind workspace preserves anonymity with the generic blind inbox/detail titles and no visible team identity.
3. Update `tests/bdd/features/authenticated/outcomes.feature` and `tests/bdd/steps/outcomes.steps.ts` to cover shortlist finalist selection, final-deliberation ranking override, winner announcement, and the current audit actions.
4. Run the narrowest practical BDD validation for the changed scenarios and record any remaining gap precisely.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Refreshed the authenticated BDD judging and outcomes coverage for the configurable judging model. The shared platform fixtures now seed canonical stage-aware judge assignments, configurable blind and pitch judging settings, backup blind scores for weighted outcomes, and scenario reset helpers so the judge workspace and outcomes flows can run deterministically against the current runtime. The judge workspace feature now asserts blind anonymity with generic inbox/detail titles, and the outcomes feature now exercises manual finalist selection, pitch review startup, partial pitch participation, final deliberation ordering, winners, prize redemption, and audit actions. Canonical docs were confirmed unchanged for this test-only scope. Validation passed with `git diff --check` on the edited files, `bun x vitest run tests/unit/support/bdd/platform-fixtures.test.ts`, and `bun x bddgen && bun x playwright test --project chromium-authenticated-bdd --grep 'TASK-4.7 judge workspace UI|TASK-3.8 authenticated outcome flows'`. No additional BDD gap remained for this task.
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
