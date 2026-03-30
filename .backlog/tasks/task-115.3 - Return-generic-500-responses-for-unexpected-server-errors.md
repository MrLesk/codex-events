---
id: TASK-115.3
title: Return generic 500 responses for unexpected server errors
status: Done
assignee: []
created_date: '2026-03-30 15:59'
updated_date: '2026-03-30 18:10'
labels:
  - security
  - backend
dependencies: []
references:
  - server/utils/api-error.ts
documentation:
  - docs/security-analysis.md
parent_task_id: TASK-115
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Prevent internal exception messages from being echoed back to clients. Expected `ApiError` responses should remain explicit, while unexpected failures should be sanitized for clients and logged server-side.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Unexpected exceptions return a generic internal-error response instead of raw exception text
- [x] #2 Intentional `ApiError` responses preserve their explicit client-visible messages and status codes
- [x] #3 Unexpected failures are logged server-side with enough context for debugging
- [x] #4 Automated tests cover both expected `ApiError` handling and sanitized unexpected-error handling
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-03-30: implemented centralized sanitization for unexpected API failures in `server/utils/api-error.ts` while preserving explicit `ApiError` responses. Added unit coverage for `toApiError()` normalization and integration coverage for sanitized route-handler responses plus server-side logging.

Validation: `bun run test:unit -- tests/unit/server/utils/api-error.test.ts` passed, `bun run test:integration -- tests/integration/server/api/api-handler.test.ts` passed. Broader `bun run typecheck` and `bun run test:unit` passed on the same worktree. `bun run lint` still fails due unrelated existing issues in `server/middleware/local-d1-binding.ts`, `tests/support/backend/api-route.ts`, and `tests/unit/server/routes/auth/account-linking.test.ts`.

2026-03-30: reviewed existing local patch in `server/utils/api-error.ts`, `tests/unit/server/utils/api-error.test.ts`, and `tests/integration/server/api/api-handler.test.ts`. The implementation satisfies the task scope: non-ApiError failures are sanitized to a generic 500, ApiError responses remain explicit, and unexpected failures are logged with request context.

Validation: `bun run test:unit -- tests/unit/server/utils/api-error.test.ts` passed, `bun run test:integration -- tests/integration/server/api/api-handler.test.ts` passed, `bun run typecheck` passed, and `bun run test:unit` passed. `bun run lint` still fails in unrelated existing files (`server/middleware/local-d1-binding.ts`, `tests/support/backend/api-route.ts`, `tests/unit/server/routes/auth/account-linking.test.ts`).
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
