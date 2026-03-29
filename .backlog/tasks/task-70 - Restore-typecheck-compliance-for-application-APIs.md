---
id: TASK-70
title: Restore typecheck compliance for application APIs
status: Done
assignee:
  - '@codex'
created_date: '2026-03-28 23:59'
updated_date: '2026-03-29 00:04'
labels: []
dependencies: []
references:
  - .github/workflows/ci.yml
  - 'server/api/hackathons/[hackathonId]/applications/index.post.ts'
  - >-
    server/api/hackathons/[hackathonId]/applications/actions/apply-staged-decisions.post.ts
documentation:
  - AGENTS.md
  - docs/api-surface.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fix the TypeScript errors currently breaking the `Typecheck` step in the `ci` workflow for the hackathon applications API. Keep the scope limited to the failing application submission and staged-decision endpoints and any directly related coverage needed to lock the typed response shape.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `bun run typecheck` passes locally from the repository root
- [x] #2 The application submission and staged-decision endpoints satisfy the current typed `serializeUserApplication` contract without changing unrelated API behavior
- [x] #3 Relevant local validation is rerun and recorded in the task summary
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Confirmed the `Typecheck` failure from GitHub Actions and local `bun run typecheck`. Fixed the applications API by adding the required `preApprovalStatus: null` field to the submission insert/response shape and by annotating the staged-decision user-id mapping with the `userApplications` row type so the callback parameter is no longer implicit `any`. Added an integration assertion that application submission responses include `preApprovalStatus: null`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Restored typecheck compliance for the hackathon applications API.

What changed:
- Added `preApprovalStatus: null` to the application submission insert payload and serialized response in `server/api/hackathons/[hackathonId]/applications/index.post.ts`.
- Added an explicit `UserApplicationRecord` type annotation for the staged-decision applicant-id mapping in `server/api/hackathons/[hackathonId]/applications/actions/apply-staged-decisions.post.ts`.
- Updated the integration coverage for application submission to assert the `preApprovalStatus: null` response shape.

Validation:
- `bun run typecheck` passed.
- `bun run test:unit` passed.
- `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/application-routes.test.ts` passed.

Docs/config:
- Canonical docs were unchanged.
- No config or workflow doc changes were required.

Risks/follow-ups:
- No product-behavior risk was introduced; this change aligns the endpoints with the current typed application record contract already used elsewhere in the API.
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
