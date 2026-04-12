---
id: TASK-192
title: >-
  Rehabilitate the Auth0-backed Playwright BDD suite against current application
  behavior
status: Done
assignee:
  - codex
created_date: '2026-04-11 22:05'
updated_date: '2026-04-12 10:46'
labels: []
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
  - docs/api-surface.md
  - docs/testing-strategy.md
  - docs/lifecycle-and-state-machines.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Bring the repository BDD suite back into alignment with the current product docs and implemented Nuxt application. The primary outcome is a reliable `bun run test:bdd` surface where stale scenarios, outdated selectors, and obsolete workflow expectations are updated to match current behavior, while any real regressions uncovered during the pass are fixed in production code instead of encoding legacy behavior into tests.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The existing Playwright BDD features and step definitions are reviewed and updated so stale expectations, routes, fixtures, and UI assertions match the current application behavior.
- [x] #2 Any genuine regressions uncovered during the rehabilitation pass are fixed in application code when the current product docs and implemented flows indicate the test should still pass.
- [x] #3 BDD bootstrap, persona, or support helpers are updated as needed so the Auth0-backed test harness reflects the current local test environment and app routing.
- [x] #4 `bun run test:bdd` passes locally without relying on deprecated behavior or test-only shortcuts.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update stale BDD flows that no longer match current route/tab structure: public hackathon detail, admin operations, judge workspace.
2. Update participant team workspace and submission scenarios to current provisional-team UX and selector patterns.
3. Reconcile API-oriented scenarios with current contracts and fixture states: participant application, team formation, submission management guardrails.
4. Fix any genuine code defects uncovered while aligning the suite, keeping docs/current behavior canonical.
5. Re-run `bun run test:bdd`, then run `bun run lint`, `bun run typecheck`, and `bun run test:unit` before handoff.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Baseline on 2026-04-12: `bun run test:bdd` yielded 22 passing and 17 failing scenarios. Most failures are stale BDD expectations around routes, tabs, selectors, and legacy behavior assumptions.

Completed rehabilitation pass:
- Shifted BDD fixture timestamps relative to the current date so lifecycle-dependent scenarios stay inside their intended registration/submission windows.
- Updated stale public, admin, judge, team-formation, and team-workspace scenarios and steps to current routes, tabs, selector patterns, and canonical solo-team behavior.
- Hardened participant team workspace and account-management steps against Nuxt hydration timing and stale client state.
- Fixed real product defects uncovered during the pass: participant team submission fields now expose stable labelable inputs, and admin-managed draft hackathons can load configured public background images via the visible-hackathon resolver.
- Aligned destructive account-management coverage to the current profile-settings UI by exercising the supported registration, profile edit, and profile-icon upload flow instead of the removed icon-deletion control.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Rehabilitated the Auth0-backed Playwright BDD suite against current application behavior and product docs. Updated stale feature expectations, routes, selectors, and fixture timing across public discovery, admin operations, judge workspace, team formation, team workspace, and destructive account-management coverage. Fixed two genuine application issues uncovered during the pass: submission form inputs now have stable accessible labels, and admin-managed draft hackathon background images resolve through the same visible-hackathon path used by the current workspace. Full validation now passes locally: `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bun run test:bdd`. Residual note: profile icon removal remains covered at the API/integration layer; the current account settings UI no longer exposes a remove-icon control, so the destructive BDD scenario now follows the supported upload flow only.
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
