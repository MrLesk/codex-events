---
id: TASK-339
title: Rename deployment domain variables without DEPLOY prefix
status: Done
assignee:
  - Codex
created_date: '2026-05-31 09:20'
updated_date: '2026-05-31 09:25'
labels:
  - deployment
  - documentation
  - operator-setup
dependencies: []
modified_files:
  - .github/workflows/ci.yml
  - .github/workflows/release-production.yml
  - .env.example
  - OPERATOR.md
  - OPERATOR-ADVANCED.md
  - DEVELOPMENT.md
  - tools/auth0/auth0-bootstrap.ts
  - tools/auth0/auth0-custom-domain.ts
  - tools/deploy/generate-wrangler-config.ts
  - tests/unit/tools/auth0-custom-domain.test.ts
  - tests/unit/tools/deploy/generate-wrangler-config.test.ts
  - tests/unit/tools/deploy/reconcile-queue-consumers.test.ts
priority: medium
ordinal: 42000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Rename the environment-local app hostname and Auth0 custom login hostname variables so operators configure BASE_DOMAIN and AUTH0_CUSTOM_DOMAIN instead of DEPLOY_BASE_DOMAIN and DEPLOY_AUTH0_CUSTOM_DOMAIN. Apply the strict compatibility policy: update callers and docs to the new names directly rather than adding legacy fallbacks.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 GitHub workflows read BASE_DOMAIN and AUTH0_CUSTOM_DOMAIN instead of DEPLOY_BASE_DOMAIN and DEPLOY_AUTH0_CUSTOM_DOMAIN.
- [x] #2 Deployment and Auth0 tooling read the new variable names directly with no legacy DEPLOY_* fallbacks for these two values.
- [x] #3 Operator, advanced operator, development docs, and .env.example describe the new variable names consistently.
- [x] #4 Relevant unit tests cover the new variable names and old-name error messages are removed.
- [x] #5 Only files related to this rename are committed; unrelated staged or dirty worktree changes remain untouched.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Replace GitHub workflow variables so dev and production use BASE_DOMAIN and AUTH0_CUSTOM_DOMAIN directly, including environment URLs, skip guards, Auth0 env wiring, and Nuxt runtime env values.
2. Update deployment/Auth0 tooling to read BASE_DOMAIN and AUTH0_CUSTOM_DOMAIN with no DEPLOY_BASE_DOMAIN or DEPLOY_AUTH0_CUSTOM_DOMAIN fallback.
3. Update operator, advanced operator, development docs, and .env.example to use the new names while keeping DEPLOY_* for Cloudflare resource/deployment metadata.
4. Update focused unit tests for deploy config generation, Auth0 custom domain derivation, and queue consumer reconciliation.
5. Run focused tests plus lint/typecheck/unit validation, then stage and commit only the rename files and TASK-339 task file, leaving unrelated .agents and skills-lock changes untouched.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Renamed the operator-facing deployment domain variables from DEPLOY_BASE_DOMAIN and DEPLOY_AUTH0_CUSTOM_DOMAIN to BASE_DOMAIN and AUTH0_CUSTOM_DOMAIN across GitHub workflows, deployment/Auth0 tooling, operator docs, development docs, .env.example, and related unit tests. The tooling reads only the new names for these two settings, with no legacy DEPLOY_* fallback paths.

Validation passed: focused Auth0/deploy tool unit tests, bun run lint, bun run typecheck, bun run test:unit, bun run test:integration, and git diff --check. No BDD run was required because this change only updates deployment configuration naming and docs, not browser Auth0 behavior.
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
