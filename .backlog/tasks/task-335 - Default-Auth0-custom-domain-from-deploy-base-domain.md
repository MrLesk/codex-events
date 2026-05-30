---
id: TASK-335
title: Default Auth0 custom domain from deploy base domain
status: Done
assignee: []
created_date: '2026-05-30 21:09'
updated_date: '2026-05-30 21:13'
labels:
  - deployment
  - auth0
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
  - tests/unit/tools/auth0-custom-domain.test.ts
  - tests/unit/tools/deploy/generate-wrangler-config.test.ts
  - tools/auth0/auth0-bootstrap.ts
  - tools/auth0/auth0-custom-domain.ts
  - tools/deploy/generate-wrangler-config.ts
priority: medium
ordinal: 38000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make DEPLOY_AUTH0_CUSTOM_DOMAIN optional for deploy workflows and operator setup. When no explicit Auth0 custom domain is configured, deployment and Auth0 automation should use auth.<DEPLOY_BASE_DOMAIN> so operators only need to provide the app domain unless they want a custom login hostname.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Deploy config generation derives the Auth0 login hostname as auth.<DEPLOY_BASE_DOMAIN> when DEPLOY_AUTH0_CUSTOM_DOMAIN is unset.
- [x] #2 Auth0 custom-domain and bootstrap tooling can derive the same default without requiring AUTH0_CUSTOM_DOMAIN in workflow environments.
- [x] #3 GitHub dev and production workflows no longer require DEPLOY_AUTH0_CUSTOM_DOMAIN to be configured for the default case.
- [x] #4 Operator and development docs describe DEPLOY_AUTH0_CUSTOM_DOMAIN as an optional override rather than a required variable.
- [x] #5 Relevant tests and validation pass.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Validation completed: bunx vitest run tests/unit/tools/deploy/generate-wrangler-config.test.ts tests/unit/tools/auth0-custom-domain.test.ts tests/unit/tools/auth0/auth0-bootstrap.test.ts; bun run lint -- --ignore-pattern '.agents/**'; bun run typecheck; bun run test:unit; git diff --check -- ':!.agents/**'. Raw bun run lint remains blocked by unrelated dirty .agents/skills files in the worktree.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Made DEPLOY_AUTH0_CUSTOM_DOMAIN optional. Deploy config now defaults the Auth0 login host to auth.<DEPLOY_BASE_DOMAIN>, Auth0 custom-domain/bootstrap tooling can derive the same default, dev and production workflows pass the fallback into Auth0 automation, and docs/.env examples describe the variable as an override only. Validation passed: focused Auth0/deploy tests, lint excluding unrelated .agents changes, typecheck, unit tests, and scoped diff whitespace checks.
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
