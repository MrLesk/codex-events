---
id: TASK-336
title: Use Nuxt Auth0 client ID secret consistently
status: Done
assignee:
  - Codex
created_date: '2026-05-30 21:14'
updated_date: '2026-05-30 21:18'
labels:
  - auth0
  - deployment
  - documentation
dependencies: []
modified_files:
  - .env.example
  - .github/workflows/ci.yml
  - .github/workflows/release-production.yml
  - DEVELOPMENT.md
  - OPERATOR-ADVANCED.md
  - OPERATOR.md
  - tests/unit/tools/auth0/auth0-bootstrap.test.ts
  - tools/auth0/auth0-bootstrap.ts
priority: medium
ordinal: 39000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Remove the separate AUTH0_APP_CLIENT_ID GitHub/operator surface for the Auth0 Regular Web Application client ID. The same client ID is required by Nuxt runtime and Auth0 tenant automation, so production and dev should both use NUXT_AUTH0_CLIENT_ID and the Auth0 bootstrap should read that canonical variable.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Production workflow reads the Auth0 Regular Web Application client ID from NUXT_AUTH0_CLIENT_ID, matching dev.
- [x] #2 Auth0 bootstrap requires NUXT_AUTH0_CLIENT_ID instead of AUTH0_APP_CLIENT_ID.
- [x] #3 Operator and development docs no longer instruct operators to set AUTH0_APP_CLIENT_ID for deployment.
- [x] #4 Environment examples use one client ID key for Nuxt runtime and Auth0 bootstrap.
- [x] #5 Relevant tests and validation pass.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Replace the production workflow secret mapping so both Auth0 bootstrap and Nuxt runtime read the Regular Web Application client ID from NUXT_AUTH0_CLIENT_ID.
2. Remove the dev workflow compatibility mapping that exports AUTH0_APP_CLIENT_ID solely for bootstrap.
3. Update tools/auth0/auth0-bootstrap.ts and its unit test fixture to require NUXT_AUTH0_CLIENT_ID directly.
4. Update .env.example, OPERATOR.md, OPERATOR-ADVANCED.md, and DEVELOPMENT.md so setup instructions expose only NUXT_AUTH0_CLIENT_ID for the Auth0 application client ID.
5. Search for remaining AUTH0_APP_CLIENT_ID references, run focused and project validation, then finalize TASK-336.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented the client ID naming cleanup with no compatibility alias: Auth0 bootstrap now requires NUXT_AUTH0_CLIENT_ID, production and dev workflows expose only NUXT_AUTH0_CLIENT_ID for the Auth0 application client ID, and setup docs/env examples no longer instruct operators to set AUTH0_APP_CLIENT_ID. Validation passed: bunx vitest run tests/unit/tools/auth0/auth0-bootstrap.test.ts; bun run lint -- --ignore-pattern '.agents/**'; bun run lint; bun run typecheck; bun run test:unit; git diff --check -- ':!.agents/**'. A repository search excluding Backlog and .agents has no AUTH0_APP_CLIENT_ID references.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
## Summary

- Removed the separate AUTH0_APP_CLIENT_ID deployment/operator surface for the Auth0 Regular Web Application client ID.
- Updated production and dev workflows so Auth0 bootstrap and Nuxt runtime both use NUXT_AUTH0_CLIENT_ID.
- Updated Auth0 bootstrap config resolution, unit fixtures, .env.example, OPERATOR.md, OPERATOR-ADVANCED.md, and DEVELOPMENT.md to document one canonical client ID key.

## Validation

- bunx vitest run tests/unit/tools/auth0/auth0-bootstrap.test.ts
- bun run lint -- --ignore-pattern '.agents/**'
- bun run lint
- bun run typecheck
- bun run test:unit
- git diff --check -- ':!.agents/**'

## Risk

No compatibility fallback remains; deployments must set NUXT_AUTH0_CLIENT_ID in GitHub environments.
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
