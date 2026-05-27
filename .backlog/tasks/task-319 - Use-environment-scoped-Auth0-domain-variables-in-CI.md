---
id: TASK-319
title: Use environment-scoped Auth0 domain variables in CI
status: Done
assignee:
  - Codex
created_date: '2026-05-27 19:46'
updated_date: '2026-05-27 19:46'
labels:
  - ci
  - auth0
dependencies: []
modified_files:
  - .env.example
  - .github/workflows/ci.yml
  - .github/workflows/release-production.yml
  - DEVELOPMENT.md
  - OPERATOR.md
  - server/routes/auth/bdd-login.ts
  - tests/bdd/support/auth0-management.ts
  - tests/bdd/support/personas.ts
  - tests/unit/support/bdd/auth0-management.test.ts
  - tests/unit/support/bdd/personas.test.ts
  - tools/auth0/auth0-bootstrap.ts
priority: medium
ordinal: 22000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the Auth0 BDD and deployment configuration contract that used TEST-specific Auth0 variable names with environment-scoped Auth0 tenant variables. The GitHub dev and production environments should use AUTH0_DOMAIN for the tenant host, AUTH0_MGMT_* for Management API credentials, and the existing runtime database connection name for BDD login/persona provisioning.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 GitHub CI no longer reads AUTH0_TEST_DOMAIN or other AUTH0_TEST_* variables for Auth0-backed BDD runs.
- [x] #2 Dev and production GitHub workflows use AUTH0_DOMAIN and AUTH0_MGMT_* as the environment-scoped Auth0 tenant configuration contract.
- [x] #3 Auth0-backed BDD support provisions personas and starts BDD login using AUTH0_DOMAIN, AUTH0_MGMT_*, and NUXT_AUTH0_DATABASE_CONNECTION_NAME.
- [x] #4 Local examples and operator/development docs describe the canonical Auth0 environment variable names without TEST-specific Auth0 tenant variables.
- [x] #5 Required validation commands pass: bun run lint, bun run typecheck, and bun run test:unit.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Replace CI and release workflow Auth0 tenant inputs so each GitHub environment supplies AUTH0_DOMAIN and AUTH0_MGMT_* instead of AUTH0_TEST_* or NUXT_AUTH0_MANAGEMENT_* GitHub variables.
2. Update BDD persona provisioning and BDD login to use AUTH0_DOMAIN, AUTH0_MGMT_*, and NUXT_AUTH0_DATABASE_CONNECTION_NAME as the canonical Auth0 tenant/connection contract.
3. Remove AUTH0_TEST_* fallback handling from the Auth0 bootstrap tool and update unit coverage for the canonical variable names.
4. Update .env.example, DEVELOPMENT.md, and OPERATOR.md so local and operator setup describe the new environment-scoped Auth0 contract.
5. Validate with lint, typecheck, unit tests, YAML parsing, and a search confirming AUTH0_TEST_* references are removed.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Created retroactively at user request after implementation. The work is a single atomic CI/Auth0 configuration cleanup, and no existing To Do or In Progress Backlog task matched the AUTH0_TEST_DOMAIN to AUTH0_DOMAIN rename.

Validation completed before finalization: bun run lint, bun run typecheck, bun run test:unit, ruby YAML parse for .github/workflows/ci.yml and .github/workflows/release-production.yml, git diff --check, and rg confirmed no AUTH0_TEST_* references remain.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Summary:
- Replaced Auth0-backed BDD and deployment CI configuration with environment-scoped AUTH0_DOMAIN and AUTH0_MGMT_* inputs.
- Updated BDD persona provisioning and /auth/bdd-login to use AUTH0_DOMAIN, AUTH0_MGMT_*, and NUXT_AUTH0_DATABASE_CONNECTION_NAME instead of AUTH0_TEST_* variables.
- Removed AUTH0_TEST_* bootstrap fallbacks and updated local/operator documentation plus unit tests.

Validation:
- bun run lint
- bun run typecheck
- bun run test:unit
- ruby YAML parse for both GitHub workflow files
- git diff --check
- rg confirmed no AUTH0_TEST_* references remain

Risks and follow-ups:
- Existing GitHub environment settings must be renamed from AUTH0_TEST_* / NUXT_AUTH0_MANAGEMENT_* to AUTH0_DOMAIN and AUTH0_MGMT_* before scheduled Auth0-backed BDD or deployment workflows run.
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
