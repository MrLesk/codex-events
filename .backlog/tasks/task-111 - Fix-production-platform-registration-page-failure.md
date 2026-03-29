---
id: TASK-111
title: Fix production platform registration page failure
status: In Progress
assignee: []
created_date: '2026-03-29 21:50'
updated_date: '2026-03-29 22:08'
labels: []
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/README.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Investigate and fix the production error that returns HTTP 500 on `/account/register` for users who need to complete platform registration and current platform document acceptance. The page must load successfully in production and support the consent completion flow that gates access to other account and hackathon registration routes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `/account/register` loads successfully in production for a user who has not completed current platform registration
- [ ] #2 The platform registration page can render the current platform Terms and Privacy Policy content without server errors
- [ ] #3 Participant registration flows that redirect to `/account/register` no longer dead-end on a production 500
- [ ] #4 Relevant automated test coverage is added or updated for the failing path
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Confirmed the production 500 with `wrangler tail` on March 30, 2026. The failing request emitted `No such module "wrangler"` from the Worker while rendering `/account/register`.

Root cause: `server/middleware/local-d1-binding.ts` attempted to load the local Wrangler platform proxy whenever any non-D1 binding was absent. Production requests that already had a real D1 binding could still hit that fallback and crash on the Worker runtime, where the `wrangler` package does not exist.

Implemented a narrower fallback: the middleware now returns immediately when a database binding is already present, and only uses the local Wrangler proxy when the request has no D1 binding at all. Added focused middleware tests for both paths. Validation passed with `bunx vitest run tests/unit/server/middleware/local-d1-binding.test.ts`, `bun run typecheck`, and `bun run test:unit`.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Canonical docs were updated or confirmed unchanged
- [ ] #2 Code behavior matches canonical docs
- [ ] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [ ] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [ ] #7 Auth and permissions changes follow the documented platform model
- [ ] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
