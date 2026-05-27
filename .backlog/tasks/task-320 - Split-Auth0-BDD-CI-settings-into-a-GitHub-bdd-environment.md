---
id: TASK-320
title: Split Auth0 BDD CI settings into a GitHub bdd environment
status: Done
assignee:
  - Codex
created_date: '2026-05-27 20:02'
updated_date: '2026-05-27 20:07'
labels:
  - ci
  - auth0
  - bdd
dependencies: []
modified_files:
  - .env.example
  - .github/workflows/ci.yml
  - .github/workflows/release-production.yml
  - DEVELOPMENT.md
  - OPERATOR.md
  - tests/bdd/support/auth0-management.ts
  - tests/bdd/support/personas.ts
  - tests/unit/support/bdd/auth0-management.test.ts
  - tests/unit/support/bdd/personas.test.ts
  - tests/unit/tools/auth0/auth0-bootstrap.test.ts
  - tools/auth0/auth0-bootstrap.ts
  - tools/auth0/auth0-custom-domain.ts
priority: medium
ordinal: 23000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Move Auth0-backed BDD CI configuration out of the GitHub dev environment into a dedicated bdd environment, and rename the Auth0 tenant host variable to AUTH0_MANAGEMENT_DOMAIN so it is not confused with the deployed app issuer/custom domain.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The Auth0-backed BDD GitHub Actions job uses the bdd GitHub environment, not dev.
- [x] #2 BDD-specific Auth0 variables and secrets are documented as belonging to the bdd GitHub environment.
- [x] #3 Auth0 tenant automation uses AUTH0_MANAGEMENT_DOMAIN and AUTH0_MANAGEMENT_AUDIENCE instead of AUTH0_DOMAIN/AUTH0_MGMT_AUDIENCE.
- [x] #4 Dev and production deployment configuration only carries Auth0 values needed for those deployed environments.
- [x] #5 Validation passes with lint, typecheck, and unit tests.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update .github/workflows/ci.yml so auth0-bdd-suite uses GitHub environment bdd, with AUTH0_MANAGEMENT_DOMAIN/AUTH0_MANAGEMENT_AUDIENCE and AUTH0_MGMT_CLIENT_ID/AUTH0_MGMT_CLIENT_SECRET for BDD Management API fixture automation.
2. Update release-production and deploy-dev runtime mapping to use AUTH0_MANAGEMENT_DOMAIN/AUTH0_MANAGEMENT_AUDIENCE for deployed environment management configuration.
3. Rename Auth0 tenant automation domain/audience inputs in tools and BDD support from AUTH0_DOMAIN/AUTH0_MGMT_AUDIENCE to AUTH0_MANAGEMENT_DOMAIN/AUTH0_MANAGEMENT_AUDIENCE.
4. Update tests and docs/examples to describe the dedicated bdd GitHub environment and the clearer AUTH0_MANAGEMENT_* domain/audience names.
5. Create/update the GitHub bdd environment variables that can be copied without losing values; do not delete old dev entries or rewrite secrets without readable values.
6. Validate with lint, typecheck, unit tests, YAML parsing, and targeted searches before committing with TASK-320.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Plan recorded before implementation. Secret migration constraint: GitHub Actions secrets are write-only, so this task can preserve/copy variable values but cannot copy old secret values into new names unless those values are supplied through another source.

Implemented the workflow split so auth0-bdd-suite uses the bdd GitHub environment. Created the bdd environment and set readable variables AUTH0_MANAGEMENT_DOMAIN, AUTH0_MANAGEMENT_AUDIENCE, and NUXT_AUTH0_DATABASE_CONNECTION_NAME from existing dev values. No GitHub secrets were overwritten or deleted; bdd currently has no secrets configured.

Adjusted dev deployment to keep using existing NUXT_AUTH0_MANAGEMENT_CLIENT_ID and NUXT_AUTH0_MANAGEMENT_CLIENT_SECRET secrets for Worker runtime secret upload. BDD remains the environment that needs AUTH0_MGMT_CLIENT_ID and AUTH0_MGMT_CLIENT_SECRET for Management API fixture automation.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Summary:
- Split the Auth0-backed BDD GitHub Actions job onto a dedicated bdd environment.
- Renamed the automation tenant host/audience contract to AUTH0_MANAGEMENT_DOMAIN and AUTH0_MANAGEMENT_AUDIENCE across workflows, Auth0 tools, BDD support, tests, and docs.
- Kept dev deployment scoped to deployed runtime needs, including existing NUXT_AUTH0_MANAGEMENT_CLIENT_ID/SECRET names for Worker secret upload.
- Created the GitHub bdd environment and set non-secret variables from existing readable dev values.

Validation:
- bun run lint
- bun run typecheck
- bun run test:unit
- Targeted unit run for BDD/Auth0 tests
- Ruby YAML parse for both GitHub workflow files
- git diff --check

Risks and follow-ups:
- The GitHub bdd environment has no secrets yet because GitHub secrets are write-only. The user needs to fill the listed bdd secrets before scheduled/manual Auth0-backed BDD runs can execute.
- Production environment variables AUTH0_MANAGEMENT_DOMAIN and optional AUTH0_MANAGEMENT_AUDIENCE still need to be present for release deployment because production currently exposes no readable environment variables through gh.
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
