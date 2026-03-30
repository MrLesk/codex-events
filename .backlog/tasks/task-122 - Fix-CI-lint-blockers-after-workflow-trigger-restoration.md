---
id: TASK-122
title: Fix CI lint blockers after workflow trigger restoration
status: Done
assignee: []
created_date: '2026-03-30 17:04'
updated_date: '2026-03-30 17:05'
labels:
  - ci
  - lint
  - tests
dependencies: []
documentation:
  - server/middleware/local-d1-binding.ts
  - tests/support/backend/api-route.ts
  - tests/unit/server/routes/auth/account-linking.test.ts
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Resolve the current GitHub Actions CI lint errors that were exposed once branch-push CI triggering was restored, so the main branch workflow can complete its backend checks again. The fix should address only the actual lint blockers and leave unrelated warning-only files unchanged.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The GitHub Actions lint errors in `server/middleware/local-d1-binding.ts`, `tests/support/backend/api-route.ts`, and `tests/unit/server/routes/auth/account-linking.test.ts` are resolved.
- [x] #2 `bun run lint` passes on the current branch without introducing new lint errors.
- [x] #3 Required validation is recorded in the task summary, including any remaining non-lint risks or follow-ups.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect the failing GitHub Actions run and confirm the exact lint errors blocking `backend-checks`.
2. Apply the smallest changes needed in the three failing files to satisfy the repository lint rules without touching warning-only files.
3. Run targeted ESLint, then `bun run lint`, `bun run typecheck`, and `bun run test:unit`, and record the outcome before pushing the fix.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Run `23757161278` failed only in `backend-checks` -> `Lint`. The blocking issues were three local code-style errors: unused binding-presence booleans in `server/middleware/local-d1-binding.ts`, arrow-parens in `tests/support/backend/api-route.ts`, and inconsistent quoted header props in `tests/unit/server/routes/auth/account-linking.test.ts`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed the CI lint blockers exposed after branch-push workflow execution was restored.

What changed:
- Removed three unused binding-presence booleans from `server/middleware/local-d1-binding.ts` that were no longer part of the middleware control flow.
- Updated `tests/support/backend/api-route.ts` to match the repository’s typed `useRuntimeConfig` stub style and satisfy the arrow-parens rule.
- Normalized the quoted `authorization` header key in `tests/unit/server/routes/auth/account-linking.test.ts` to satisfy the quote-props rule.

Validation:
- `bun x eslint server/middleware/local-d1-binding.ts tests/support/backend/api-route.ts tests/unit/server/routes/auth/account-linking.test.ts`
- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`

Remaining note:
- `bun run lint` still reports six existing `vue/no-v-html` warnings in public/legal pages, but it now exits successfully with no errors, so CI is no longer blocked by lint.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [ ] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
