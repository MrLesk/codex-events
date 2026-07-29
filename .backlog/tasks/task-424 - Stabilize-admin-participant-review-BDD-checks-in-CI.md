---
id: TASK-424
title: Stabilize admin participant-review BDD checks in CI
status: In Progress
assignee:
  - '@codex'
created_date: '2026-07-29 04:55'
updated_date: '2026-07-29 05:13'
labels: []
dependencies: []
references:
  - 'https://github.com/MrLesk/codex-events/actions/runs/30421228684'
modified_files:
  - tests/bdd/steps/admin-operations.steps.ts
priority: high
type: bug
ordinal: 111000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The scheduled deploy-test workflow intermittently fails two admin participant-review scenarios while the backend checks and remaining BDD suite pass. Stabilize the application-row interaction without weakening browser actionability checks.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The approve and reject participant-review scenarios pass under CI-equivalent execution
- [ ] #2 The full BDD suite passes without retries or forced browser clicks
- [ ] #3 Lint, typecheck, unit, and integration validation pass
<!-- AC:END -->

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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reproduce and inspect the failing browser interactions.
2. Wait for the requested application row and stabilize its exact decision control before clicking.
3. Run targeted and full validation, then confirm the workflow in GitHub Actions.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
The first GitHub rerun on commit e92c5d6c reproduced both failures and disproved the eager-component hypothesis, so that production change was reverted. The CI evidence isolates the issue to browser-step synchronization: the asynchronously rendered row exceeded Playwright's five-second assertion default, and combining automatic scrolling with the decision click caused the long list to oscillate on the CI viewport.

The focused BDD step now uses an explicit 15-second locator timeout for the requested row, scopes its decision button to that row, scrolls the control separately, verifies it is in the viewport, and then performs the normal actionability-checked click. No retries, forced clicks, or fixed sleeps were added.
<!-- SECTION:NOTES:END -->
