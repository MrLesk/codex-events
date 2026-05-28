---
id: TASK-323
title: Derive deployment resource names from environment-local defaults
status: Done
assignee: []
created_date: '2026-05-28 20:29'
updated_date: '2026-05-28 20:37'
labels:
  - deployment
  - configuration
  - docs
dependencies: []
documentation:
  - OPERATOR.md
  - DEVELOPMENT.md
  - .env.example
  - .github/workflows/ci.yml
  - .github/workflows/release-production.yml
  - tools/deploy/generate-wrangler-config.ts
modified_files:
  - .env.example
  - .github/workflows/ci.yml
  - .github/workflows/release-production.yml
  - DEVELOPMENT.md
  - OPERATOR.md
  - README.md
  - tests/unit/tools/auth0/auth0-bootstrap.test.ts
  - tests/unit/tools/deploy/generate-wrangler-config.test.ts
  - tools/auth0/auth0-bootstrap.ts
  - tools/deploy/generate-wrangler-config.ts
priority: high
ordinal: 26000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Reduce required GitHub and local deployment variables by deriving resource names from an environment-local DEPLOY_ENV_NAME, DEPLOY_RESOURCE_PREFIX, and explicit DEPLOY_BASE_DOMAIN. Keep each GitHub environment self-contained, require domains that cannot be guessed, and allow operators to override fully derived values.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Deployment config uses environment-local DEPLOY_BASE_DOMAIN instead of target-specific DEPLOY_DEV_BASE_DOMAIN or DEPLOY_PRODUCTION_BASE_DOMAIN.
- [x] #2 Deployment resource names default from DEPLOY_ENV_NAME and DEPLOY_RESOURCE_PREFIX, with DEPLOY_RESOURCE_PREFIX defaulting to codex-events.
- [x] #3 Domains that cannot be guessed remain explicit environment values, while derived resource names remain fully overridable.
- [x] #4 GitHub workflows, local .env example, operator docs, and developer docs describe the same configuration model.
- [x] #5 Relevant tests and validation pass.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented environment-local deployment configuration. Workflows and deploy config generation now use DEPLOY_BASE_DOMAIN instead of target-specific domain variable names, derive resource names from DEPLOY_ENV_NAME and DEPLOY_RESOURCE_PREFIX with DEPLOY_RESOURCE_PREFIX defaulting to codex-events, and leave non-guessable domains explicit. Generated resource names remain overridable through the existing DEPLOY_CF_* variables. Auth0 database connection defaults to Username-Password-Authentication in deploy config and Auth0 bootstrap. Docs and .env.example now describe the same GitHub/local model. GitHub dev variables were updated to DEPLOY_BASE_DOMAIN=dev.codex-hackathons.com, DEPLOY_ENV_NAME=dev, DEPLOY_RESOURCE_PREFIX=codex-events; obsolete derived binding/retry variables and DEPLOY_DEV_BASE_DOMAIN were removed. GitHub production was seeded with DEPLOY_BASE_DOMAIN=codex-hackathons.com, DEPLOY_ENV_NAME=prod, DEPLOY_RESOURCE_PREFIX=codex-events. Current dev resource-name overrides remain because the existing Cloudflare resources are still named with codex-hackathons. Validation passed: bun run lint, bun run typecheck, bun run test:unit, bun run test:integration, git diff --check, and a dev config generation smoke test using the current dev values.
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
