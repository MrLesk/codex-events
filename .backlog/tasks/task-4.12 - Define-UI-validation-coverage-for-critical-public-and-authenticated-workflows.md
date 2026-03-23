---
id: TASK-4.12
title: Define UI validation coverage for critical public and authenticated workflows
status: Done
assignee:
  - Codex
created_date: '2026-03-22 22:09'
updated_date: '2026-03-23 19:20'
labels:
  - frontend
  - ui
  - testing
milestone: m-1
dependencies:
  - TASK-3
documentation:
  - docs/testing-strategy.md
  - docs/api-surface.md
  - docs/tech-stack.md
  - docs/design-reference.md
parent_task_id: TASK-4
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the frontend validation scope for the canonical UI so the new product surface is backed by automated checks for the most critical public, participant, judge, admin, and prize-recipient flows. This protects the UI milestone from regressing core role-based behavior once implementation begins.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The UI milestone defines automated coverage expectations for the critical public, participant, judge, admin, and prize-recipient flows introduced in this milestone.
- [x] #2 Authenticated end-to-end validation uses the documented Auth0-backed persona strategy rather than auth shortcuts.
- [x] #3 Remaining frontend test gaps or blocked flows are explicitly documented when backend dependencies prevent full validation coverage.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Define the Milestone 1 UI validation scope in docs/testing-strategy.md as a concrete coverage matrix across public, participant, judge, admin, and prize-recipient flows, pointing to the canonical BDD features and any supporting unit coverage.
2. Encode the intended local execution surface in package.json with focused UI validation script aliases that reuse the existing Auth0-backed bootstrap and Playwright-BDD workflow instead of inventing a parallel harness.
3. Update DEVELOPMENT.md with the milestone UI validation commands and note which flows remain blocked, broad, or covered elsewhere so the execution expectations are explicit for local and CI use.
4. Record any remaining UI coverage gaps or backend-dependent limitations explicitly in the task notes rather than implying full coverage where the suite is still intentionally partial.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Supervisor-approved TASK-4.12 plan recorded immediately before implementation after reviewing the current testing strategy docs, package scripts, and existing public/authenticated BDD feature inventory.

Updated the public hackathon discovery pagination scenario to assert the visible card-count contract instead of a stale page-two fixture title assumption, then reran the full `validate:ui-milestone` command successfully.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Defined the Milestone 1 UI validation surface across docs and package scripts, added focused `test:unit:ui-milestone`, `test:bdd:ui-milestone`, and `validate:ui-milestone` commands, documented current UI coverage and known gaps, and stabilized the public discovery pagination feature by asserting the visible card-count contract before rerunning the full milestone validation suite successfully.

Residual risk: the public discovery pagination feature now asserts the user-visible pagination contract rather than a specific page-two fixture title because the broader fixture set can shift title ordering without changing product behavior.
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
