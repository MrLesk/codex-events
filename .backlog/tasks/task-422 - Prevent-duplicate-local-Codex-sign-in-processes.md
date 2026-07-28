---
id: TASK-422
title: Prevent duplicate local Codex sign-in processes
status: Done
assignee:
  - '@codex'
created_date: '2026-07-28 20:57'
updated_date: '2026-07-28 20:59'
labels: []
dependencies: []
modified_files:
  - server/auth/local-codex-auth.ts
  - tests/unit/server/auth/local-codex-auth.test.ts
priority: high
type: bug
ordinal: 109000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A slow local sign-in request can be activated more than once before the first request completes. Each request currently spawns its own `codex login` process, opening duplicate authorization tabs; cancelling either flow surfaces an application error.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Concurrent local sign-in requests share one in-flight Codex authentication attempt
- [x] #2 A completed or failed attempt does not prevent a later sign-in attempt
- [x] #3 Automated tests cover concurrent request deduplication and existing local authentication behavior remains intact
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
1. Add a failing concurrency test around the local Codex authentication boundary. 2. Share only the active authentication promise and clear it after success or failure. 3. Run focused and repository auth validation, then commit and push the scoped fix.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Root cause evidence: macOS LaunchServices recorded two distinct Codex PIDs opening authorization URLs 0.46 seconds apart from concurrent pending requests. The regression test failed before the fix with 3 spawned processes instead of 2 across a concurrent pair and later retry, then passed after sharing only the active authentication promise.

Validation: focused auth suite passed 12 tests; full lint, typecheck, 791 unit tests, 360 integration tests, and git diff --check passed. Auth0-backed BDD was attempted but could not start because the zero-config local environment does not define the eight required E2E persona credentials. Canonical docs and contributor setup remain unchanged because the fix only deduplicates an in-flight local request. Risk is limited to the lifetime of one Nuxt server process; settled attempts are deliberately cleared so later sign-ins can start normally. No follow-up work is required.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Concurrent local sign-in requests now await one shared Codex authentication attempt instead of spawning duplicate browser flows. A red-green lifecycle test proves pending attempts are deduplicated and a later retry still starts normally; lint, typecheck, 791 unit tests, and 360 integration tests pass.
<!-- SECTION:FINAL_SUMMARY:END -->
