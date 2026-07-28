---
id: TASK-423
title: Replace Auth0 test personas with local sessions
status: Done
assignee:
  - '@codex'
created_date: '2026-07-28 21:39'
updated_date: '2026-07-28 22:15'
labels: []
dependencies: []
documentation:
  - docs/testing-strategy.md
  - DEVELOPMENT.md
  - docs/superpowers/specs/2026-07-28-local-test-personas-design.md
priority: high
type: task
ordinal: 110000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
BDD and the local load runner use fixed local email sessions and D1-owned roles, so contributors and CI can exercise multiple actor types without Auth0 tenants, credentials, passwords, or browser login automation. Production authentication remains Auth0.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `bun run test:bdd` runs from a clean environment without Auth0 or E2E persona settings
- [x] #2 BDD covers platform-admin, event-admin, judge, and regular-user behavior through fixed local sessions whose permissions come only from D1 fixtures
- [x] #3 The local load runner uses the same Auth0-free persona sessions
- [x] #4 BDD CI no longer requires or conditionally checks Auth0 credentials and persona secrets
- [x] #5 Production Auth0 configuration and behavior remain unchanged
- [x] #6 Canonical testing documentation, contributor instructions, examples, features, and automated tests describe the local persona model
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
1. Define four fixed local personas and direct Playwright storage-state generation with focused test-first coverage.
2. Simplify BDD bootstrap and D1 fixtures; delete BDD-only Auth0 management, login automation, and callback routes.
3. Force Playwright BDD into local auth, update scenario wording, and run the complete BDD suite without secrets.
4. Reuse the same personas and storage state in the local load runner, then smoke-test it.
5. Remove BDD Auth0 configuration from CI/examples/bootstrap automation and update DEVELOPMENT plus canonical testing guidance.
6. Run full validation, update acceptance criteria, commit scoped files to main, and push origin/main.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Approved design recorded for fixed local email sessions shared by BDD and load testing; production Auth0 remains unchanged.

Implemented fixed platform-admin, event-admin, judge, and regular-user local sessions using the existing codex-events-local-user cookie. D1 remains the only source of roles. Removed BDD Auth0 provisioning, browser login automation, callback routes, credentials, CI environment gating, and BDD callback automation. The local load runner reuses the same session writer.

Validation: bun run lint; bun run typecheck; bun run test:all with Auth0 and E2E variables removed (788 unit, 360 integration, 51 regular BDD, 2 destructive BDD); supported load --smoke completed all lifecycle phases with 40 participants and no Auth0 settings. The smoke run exposed and fixed a Wrangler subprocess buffer limit and stale event_tracks seed columns. No unresolved risks or follow-up work.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Replaced Auth0-backed BDD and local-load authentication with four deterministic local persona sessions whose authorization comes from D1. Production Auth0 remains unchanged. Removed obsolete Auth0 test machinery and secrets, updated CI and canonical documentation, and verified the complete test suite plus a full-lifecycle 40-participant load smoke without Auth0 configuration.
<!-- SECTION:FINAL_SUMMARY:END -->
