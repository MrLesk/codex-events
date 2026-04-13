---
id: TASK-205.5.1
title: Refresh non-BDD automated judging coverage for configurable judging
status: Done
assignee: []
created_date: '2026-04-13 08:22'
updated_date: '2026-04-13 08:27'
labels:
  - judging
  - tests
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
Update unit and integration tests outside the BDD suite so server and app automation cover the canonical configurable judging model, including canonical lifecycle states and stage-aware judging assertions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Stale automated tests stop referencing judge_review or shortlist-reorder semantics where the canonical model now uses blind_review pitch_review and final_deliberation
- [x] #2 Unit and integration coverage assert blind-only blind-plus-pitch and pitch-only scoring and lifecycle behavior where those paths are exercised in code
- [x] #3 Required targeted validation for the changed non-BDD suites passes locally
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Supervisor context brief (L2): the stale non-BDD coverage is concentrated in tests that still mention `judge_review` or old shortlist semantics, especially `tests/unit/server/utils/submissions.test.ts`, `tests/integration/server/api/submission-routes.test.ts`, and a few integration naming/assertion leftovers in hackathon/judging/outcome suites. Keep this task test-only: update non-BDD unit/integration expectations to the canonical `blind_review`, `pitch_review`, and `final_deliberation` model, and extend assertions only where the implemented runtime behavior is already present.

Refreshed the stale non-BDD judging coverage to the canonical configurable-judging lifecycle without changing runtime code. Updated submission helper/route assertions away from `judge_review`, renamed stale blind-review labels, and validated pitch-only plus shortlist-driven pitch startup coverage where the runtime already exposes it.

Validation: `bunx vitest run tests/unit/server/utils/submissions.test.ts tests/unit/server/utils/judging.test.ts` and `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/submission-routes.test.ts tests/integration/server/api/hackathon-routes.test.ts` both passed locally. Plain `vitest` does not exercise the integration config, so the integration suite was rerun explicitly.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated the non-BDD automated coverage for the configurable judging model across unit and integration suites. Submission helper and route tests now use canonical post-blind lifecycle states instead of `judge_review`, blind-review startup coverage is labeled against the new terminology, and judging/integration coverage now asserts pitch-only and shortlist-driven pitch startup behavior that already exists in the runtime. Validation passed with `bunx vitest run tests/unit/server/utils/submissions.test.ts tests/unit/server/utils/judging.test.ts` and `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/submission-routes.test.ts tests/integration/server/api/hackathon-routes.test.ts`. No runtime files changed in this task; remaining judging automation drift is isolated to the BDD suite in TASK-205.5.2.
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
