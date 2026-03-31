---
id: TASK-137
title: Fix CI typecheck regression in account-link login route
status: Done
assignee: []
created_date: '2026-03-31 19:14'
updated_date: '2026-03-31 19:15'
labels:
  - ci
  - auth0
  - account-linking
  - bug
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The TASK-136 account-linking fix introduced a route import that only typechecks when unrelated local edits are present. Update the account-link login route to use committed exports so GitHub Actions backend typecheck passes on a clean checkout.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The account-link login route typechecks on a clean checkout without depending on unrelated local exports from `server/auth/actor.ts`.
- [x] #2 Local `bun run typecheck` and the relevant auth-link unit tests pass after the route import fix.
- [x] #3 No unrelated auth-link behavior changes are introduced.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect the failing GitHub Actions typecheck log for the backend-checks job.
2. Replace the route dependency on an uncommitted `server/auth/actor.ts` export with committed lower-level helpers.
3. Re-run route tests and repo validation, then push the CI fix.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
GitHub Actions run 23814899039 failed in backend-checks/typecheck because `server/routes/auth/link/login.ts` imported `getRequestLinkablePlatformAccountIdentity`, but that symbol was not exported in the committed `server/auth/actor.ts` on a clean checkout.

The local dirty worktree masked the issue because an unrelated unstaged edit in `actor.ts` added that export. The committed fix now uses `getDatabase(event)` plus `findLinkablePlatformAccountIdentity(...)` directly, which is already part of the committed auth-link utility surface.

No behavior changed in the account-link flow; this only removes the accidental dependency on unrelated local edits so CI can typecheck the route on Linux.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed the CI typecheck regression introduced by TASK-136. `server/routes/auth/link/login.ts` no longer imports `getRequestLinkablePlatformAccountIdentity` from `server/auth/actor.ts`; instead it uses the already-committed `findLinkablePlatformAccountIdentity(...)` helper with `getDatabase(event)` directly. This removes the accidental dependency on unrelated local `actor.ts` edits that were present in the dirty worktree but not in the pushed commit.

Validated with `bun x vitest run tests/unit/server/routes/auth/account-linking.test.ts`, `bun run lint` (existing warnings only), `bun run typecheck`, and `bun run test:unit`. Risk is minimal and localized to the account-link login route import surface.
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
