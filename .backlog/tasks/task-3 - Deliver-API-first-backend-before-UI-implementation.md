---
id: TASK-3
title: Deliver API-first backend before UI implementation
status: Done
assignee: []
created_date: '2026-03-22 18:55'
updated_date: '2026-03-22 23:36'
labels:
  - backend
  - api
  - initiative
milestone: m-0
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/permissions-matrix.md
  - docs/schema-outline.md
  - docs/testing-strategy.md
  - docs/tech-stack.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the canonical backend program for the Codex hackathon platform before any UI work proceeds. The backend must cover the business logic documented in docs/, treat Auth0 as identity only, keep authorization in application data, and ensure every implemented API is backed by automated validation. This parent task coordinates the subtask breakdown for API contracts, shared foundations, domain APIs, platform account deletion, exact-version document acceptance, derived operational read models, and final validation gating.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The initiative is broken down into focused subtasks that cover API contracts, shared backend foundations, domain APIs, platform account deletion, versioned document acceptance flows, derived operational read models, and validation gates.
- [x] #2 The planned backend scope covers the canonical business workflows documented in docs/ before UI implementation begins and assigns ownership for each documented workflow.
- [x] #3 Each implemented API area requires unit and integration coverage plus Auth0-backed end-to-end coverage where actor-facing behavior is exposed, and the initiative includes CI enforcement for those requirements.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Define the canonical backend API contract and shared runtime foundations, then establish actor resolution, authorization, and Auth0-backed automated test foundations.
2. Deliver the domain API surface across session and document management, hackathon administration, applications, teams, submissions, judging, shortlist and winner workflows, prize redemption, and restricted audit reads, keeping behavior aligned with the canonical docs.
3. Enforce the backend release gate in CI with lint, typecheck, unit, integration, and Auth0-backed BDD coverage so the API-first backend is complete before UI implementation proceeds.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
All planned backend subtasks under TASK-3 are complete, including TASK-3.8 and TASK-3.9, which closed the outcome APIs and CI/Auth0-backed validation gate referenced by this parent initiative.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed the API-first backend initiative that gates UI implementation. The backend program now covers the canonical workflows documented in docs/ across account/session and document management, hackathon administration, applications, teams, submissions, judging, shortlist and winner workflows, prize redemption, and restricted audit reads. The initiative was executed through focused subtasks for API contracts, shared foundations, authorization, automated test foundations, domain APIs, outcome APIs, and final CI enforcement. Auth0 remains the identity provider only, while authorization stays in application data and follows the documented permissions model. Validation is enforced through the backend release gate introduced in TASK-3.9, which runs lint, typecheck, unit tests, integration tests, and the full Auth0-backed BDD suite. Canonical docs and contributor/test workflow docs were updated where needed during the initiative, and there are no remaining documented backend release-gate gaps before canonical UI implementation begins. Residual risk is operational rather than functional: repository and CI Auth0 secrets must remain aligned with the documented environment for the Auth0-backed suite to stay green.
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
