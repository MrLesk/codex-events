---
id: TASK-29
title: Remove obsolete platform onboarding flow end-to-end
status: Done
assignee: []
created_date: '2026-03-26 21:35'
updated_date: '2026-03-26 21:46'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Eliminate the legacy profile onboarding concept so authenticated platform users are treated as fully provisioned immediately, with no onboarding-specific routing, gating, API metadata, or canonical documentation references.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Server authorization no longer blocks platform users based on onboarding state and no onboarding-specific error is emitted.
- [x] #2 Client auth/navigation/session models remove onboarding-specific state and redirects while preserving required platform-account behavior.
- [x] #3 Obsolete onboarding routes/helpers are removed or repurposed so entry points route cleanly to dashboard/settings without onboarding semantics.
- [x] #4 Canonical docs in docs/ reflect the new current truth with no platform onboarding lifecycle/state references.
- [x] #5 Relevant unit/integration tests are updated to match the new behavior and pass.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Removed the obsolete platform onboarding flow end-to-end. Server auth no longer enforces onboarding completion; session and actor payloads no longer expose onboarding fields; client navigation/session models and account/team routing no longer reference onboarding; obsolete onboarding route page was removed; canonical docs were rewritten to remove onboarding lifecycle/state concepts; migrations and schema were cleaned to remove onboarding_state from the canonical model; and affected unit/integration/bdd tests were updated accordingly. Validation passed via targeted unit tests, targeted integration tests, and nuxt typecheck.
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
