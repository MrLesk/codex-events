---
id: TASK-3.9
title: Enforce backend CI gates and complete Auth0-backed end-to-end API coverage
status: Done
assignee:
  - '@codex'
created_date: '2026-03-22 18:55'
updated_date: '2026-03-22 23:33'
labels:
  - backend
  - testing
  - ci
  - auth0
milestone: m-0
dependencies:
  - TASK-3.4
  - TASK-3.5
  - TASK-3.6
  - TASK-3.7
  - TASK-3.8
documentation:
  - docs/testing-strategy.md
  - DEVELOPMENT.md
  - .env.example
  - .github/workflows/ci.yml
parent_task_id: TASK-3
priority: high
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Finalize the API-first backend program by enforcing the required automated validation in continuous integration and closing any remaining cross-domain Auth0-backed end-to-end coverage gaps across the backend workflows.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Continuous integration runs the required backend validation and test commands for the API-first program.
- [x] #2 Auth0-backed end-to-end coverage closes the remaining cross-domain gaps across the documented personas and implemented backend workflows without auth bypasses or fake tokens.
- [x] #3 The backend initiative is validated as the release gate before UI implementation begins.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Upgrade the GitHub Actions backend gate so CI runs the required API-first validation surface, including unit, integration, and Auth0-backed BDD coverage with the repository's documented test environment inputs.
2. Close the remaining Auth0-backed end-to-end coverage gap in the backend program by converting the stale disabled API-management artifact into current BDD-authored coverage for the still-uncovered admin configuration and current-document workflows.
3. Update contributor and testing docs to reflect the actual backend release gate, the current BDD/API coverage status, and the correct local commands and environment requirements.
4. Run the full validation set, finalize TASK-3.9 in Backlog, and create a dedicated commit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
No active implementation has started for TASK-3.9. Treat this as the final validation-and-CI task that begins only after TASK-3.4 through TASK-3.8 are truly finalized.

Current-state note: authenticated end-to-end coverage in this repository is now BDD-authored and lives under `tests/bdd`. Any older mental model of a separate `tests/e2e` execution surface is stale and should not be used when TASK-3.9 begins.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed the backend release-gate task for the API-first program. Expanded .github/workflows/ci.yml into a backend release-gate workflow that runs lint, typecheck, unit tests, integration tests, and the full Auth0-backed BDD suite with the documented environment inputs and repository secrets. Added a dedicated validate:backend script in package.json so local and CI validation use the same command surface, and restored the documented test:bdd:install alias for contributor workflow consistency. Closed the remaining Auth0-backed end-to-end gap by replacing the stale disabled Playwright artifact with a BDD-authored admin-configuration scenario that covers authenticated hackathon creation, evaluation-criterion creation, hackathon terms versioning, setting current application terms, and reading current terms through the real Auth0 session model. Updated DEVELOPMENT.md, docs/testing-strategy.md, and .env.example so the backend release gate, required commands, and Auth0-backed BDD environment are documented consistently. Validation passed with bun run validate:backend, which ran bun run lint, bun run typecheck, bun run test:unit, bun run test:integration, and bun run test:bdd successfully. There are no remaining documented backend release-gate gaps before UI implementation; residual operational risk is limited to keeping GitHub repository secrets aligned with the documented Auth0-backed CI environment.
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
