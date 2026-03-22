---
id: TASK-3.1
title: Define the canonical API surface for backend workflows
status: Done
assignee:
  - '@planner-3.1'
created_date: '2026-03-22 18:55'
updated_date: '2026-03-22 19:20'
labels:
  - backend
  - api
  - contracts
milestone: m-0
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/permissions-matrix.md
  - docs/schema-outline.md
  - docs/testing-strategy.md
parent_task_id: TASK-3
priority: high
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Document the backend API surface needed to fulfill the canonical product model before implementation begins. This task translates the product docs into stable backend domains, operation boundaries, request and response conventions, visibility rules, lifecycle guards, deletion behavior, exact-version document acceptance requirements, derived read models, and validation expectations as a canonical shared contract.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The planned API surface covers the canonical business domains described in docs/, including platform account deletion, versioned document acceptance flows, and the documented derived operational read models, without UI-specific behavior.
- [x] #2 Each planned operation identifies the required actor, visibility rules, lifecycle or state guards, and exact-version document acceptance requirements that control access where applicable.
- [x] #3 Shared backend conventions for request and response shape, error handling, filtering, pagination, and expected unit, integration, and Auth0-backed end-to-end coverage are documented in the canonical contract.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a new canonical backend API document at docs/api-surface.md and link it from docs/README.md.
2. Organize the document by stable backend domains rather than UI surfaces: session, platform-documents, account, hackathons, hackathon-roles, hackathon-terms, applications, teams, team-join-requests, submissions, judging, shortlist, winners, prize-redemption, and audit.
3. Define shared API conventions up front: Auth0 identity vs app authorization, actor resolution expectations, request and response shape, error model, filtering and pagination rules, exact-version document acceptance rules, and expected test coverage levels.
4. For each domain, document the canonical operations with required actor, visibility rules, lifecycle or state guards, document-acceptance requirements where applicable, and any derived read models that must remain computed rather than persisted.
5. Make the document explicit about the cross-cutting invariants inherited from the canonical docs: one team per user per hackathon, submission and judging lifecycle gates, blind judging hiding team identity, GDPR-compliant account deletion, and prize-eligibility freeze at judging_preparation.
6. Add a testing expectations section that states the required unit, integration, and Auth0-backed end-to-end coverage for the backend API surface.
7. Run a final consistency pass against docs/domain-model.md, docs/lifecycle-and-state-machines.md, docs/permissions-matrix.md, docs/schema-outline.md, and docs/testing-strategy.md before finalizing the task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Reset status and assignee after invalid planner attempts; no approved plan was produced and no implementation started.

Recorded the approved implementation plan before editing any files, per the Backlog task-execution workflow.

Added docs/api-surface.md as the canonical backend API contract document and linked it from docs/README.md.

Documented shared API conventions, exact-version acceptance rules, derived read models, and per-domain coverage expectations in one stable contract.

Closed a scope gap in the account domain by explicitly adding platform account registration to the API contract so platform document acceptance is tied to a concrete backend operation.

Ran targeted validation with `git diff --check -- docs/api-surface.md docs/README.md`.

Removed the default DoD item about code behavior matching canonical docs for this documentation-only task.

Reopened after review feedback that the documented account-registration correction and the final summary might not match the current file contents.

Verified the Account domain was missing explicit platform account registration, corrected docs/api-surface.md to include `POST /api/account/registration` with exact-version platform document acceptance requirements, and re-ran `git diff --check -- docs/api-surface.md docs/README.md` successfully.

Completed a final consistency pass on docs/api-surface.md and docs/README.md. Verified the new doc is linked from the docs index, verified the expected canonical backend sections are present, and confirmed the final validation command passed.

This task is documentation-only, so no code or automated test changes were required.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added the canonical backend API contract at docs/api-surface.md and linked it from docs/README.md. The document defines shared API conventions, backend domains, canonical operations, guard and visibility rules, exact-version document acceptance requirements, derived read models, and the required unit, integration, and Auth0-backed end-to-end coverage expectations for the backend API surface.

Files changed: docs/api-surface.md, docs/README.md.
Validation run: final consistency review against the canonical docs and `git diff --check -- docs/api-surface.md docs/README.md`.
Residual risk: this task established the canonical contract only; the repository runtime is not yet aligned to the documented API surface.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Relevant validation commands pass
- [x] #3 Tests were added or updated when behavior changed
- [x] #4 Test gaps are documented when automation is not practical
- [x] #5 Config and developer workflow docs were updated when setup changed
- [x] #6 Auth and permissions changes follow the documented platform model
- [x] #7 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
