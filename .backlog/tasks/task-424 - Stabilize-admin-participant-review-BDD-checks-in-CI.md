---
id: TASK-424
title: Stabilize admin participant-review BDD checks in CI
status: Done
assignee:
  - '@codex'
created_date: '2026-07-29 04:55'
updated_date: '2026-07-29 05:27'
labels: []
dependencies: []
references:
  - 'https://github.com/MrLesk/codex-events/actions/runs/30421228684'
  - 'https://github.com/MrLesk/codex-events/actions/runs/30424619106'
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
- [x] #1 The approve and reject participant-review scenarios pass under CI-equivalent execution
- [x] #2 The full BDD suite passes without retries or forced browser clicks
- [x] #3 Lint, typecheck, unit, and integration validation pass
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
1. Reproduce and inspect the failing browser interactions.
2. Wait for the requested application row and stabilize its exact decision control before clicking.
3. Run targeted and full validation, then confirm the workflow in GitHub Actions.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
The first GitHub rerun on commit e92c5d6c reproduced both failures and disproved the eager-component hypothesis, so that production change was reverted. The CI evidence isolates the issue to browser-step synchronization: the asynchronously rendered row exceeded Playwright's five-second assertion default, and combining automatic scrolling with the decision click caused the long list to oscillate on the CI viewport.

The focused BDD step now uses an explicit 15-second locator timeout for the requested row, scopes its decision button to that row, scrolls the control separately, verifies it is in the viewport, and then performs the normal actionability-checked click. No retries, forced clicks, or fixed sleeps were added.

Validation passed locally: bun run lint, bun run typecheck, 788 unit tests, 360 integration tests, 51 regular BDD scenarios, and 2 destructive BDD scenarios. GitHub Actions run 30424619106 passed both admin participant-review scenarios (16.3s and 3.5s), all 51 regular BDD scenarios, and both destructive scenarios.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Stabilized the admin participant-review BDD steps by waiting for the asynchronous row and separating viewport stabilization from the normal actionability-checked click. The production component change explored during diagnosis was reverted. Verified locally with the full validation suite and on GitHub Actions run 30424619106. Canonical docs, configuration, authentication, and permissions are unchanged; no known follow-up risk remains.
<!-- SECTION:FINAL_SUMMARY:END -->
