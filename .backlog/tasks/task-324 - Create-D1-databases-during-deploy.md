---
id: TASK-324
title: Create D1 databases during deploy
status: Done
assignee:
  - Codex
created_date: '2026-05-28 21:18'
updated_date: '2026-05-28 21:24'
labels:
  - deploy
  - cloudflare
  - docs
dependencies: []
modified_files:
  - .github/workflows/ci.yml
  - .github/workflows/release-production.yml
  - package.json
  - tools/deploy/generate-wrangler-config.ts
  - tools/deploy/ensure-d1-database.ts
  - tests/unit/tools/deploy/generate-wrangler-config.test.ts
  - tests/unit/tools/deploy/ensure-d1-database.test.ts
  - OPERATOR.md
  - DEVELOPMENT.md
  - .env.example
priority: medium
ordinal: 27000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make remote deployment create or find its target Cloudflare D1 database idempotently instead of requiring operators to store DEPLOY_CF_D1_DATABASE_ID in GitHub environment variables. The default setup should derive the D1 database name from the deploy environment/resource prefix, resolve the UUID during CI, and keep explicit D1 name overrides only for operators who use custom resource names.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Dev and production workflows resolve the D1 database ID before generating Wrangler config for migrations or deploys.
- [x] #2 Operators no longer need to set DEPLOY_CF_D1_DATABASE_ID in the default GitHub environment setup.
- [x] #3 The generated Wrangler config still contains the resolved D1 database ID required by Wrangler.
- [x] #4 Docs and example environment files describe the new default setup and the remaining D1 customization options.
- [x] #5 Focused unit coverage verifies D1 ID resolution behavior and the missing-ID failure is removed.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a deploy helper for D1 resolution that derives the configured D1 database name, lists remote D1 databases through Wrangler JSON output, creates the database when missing, and writes a generated DEPLOY_RESOLVED_D1_DATABASE_ID into the job environment for Wrangler config generation.
2. Update dev and production workflows to run the helper before queue creation, migrations, and deploy so generated Wrangler config receives a concrete database_id without requiring a GitHub environment variable.
3. Make local deploy/migration package scripts ensure D1 before generating config so manual operators do not need an extra setup command.
4. Remove DEPLOY_CF_D1_DATABASE_ID from the operator-facing default setup and example environment contract while keeping DEPLOY_CF_D1_DATABASE_NAME as the customization point.
5. Add focused unit tests for config resolution and D1 helper parsing/control flow.
6. Remove DEPLOY_CF_D1_DATABASE_ID from the dev GitHub environment after code/docs are updated, then run lint, typecheck, and unit tests before commit/push.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented D1 provisioning through a deploy helper that resolves the database name from existing deploy defaults, lists D1 databases with Wrangler JSON output, creates the database when absent, and writes a job-local DEPLOY_RESOLVED_D1_DATABASE_ID for generated Wrangler config. Removed the operator-facing DEPLOY_CF_D1_DATABASE_ID contract from docs, workflows, examples, and GitHub environment variables. Validation passed: git diff --check, bun run lint, bun run typecheck, bun run test:unit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented idempotent D1 provisioning for remote deploys. Dev and production workflows now run a D1 ensure step before generated Wrangler config is used, local deploy/migration scripts ensure D1 automatically, and generated Wrangler config receives a job-local resolved D1 UUID instead of requiring operators to store DEPLOY_CF_D1_DATABASE_ID. Updated OPERATOR.md, DEVELOPMENT.md, and .env.example to remove the D1 ID setup requirement while keeping DEPLOY_CF_D1_DATABASE_NAME as the customization point. Added focused unit tests for D1 list parsing, create-if-missing behavior, concurrent create handling, GitHub output writing, and deploy resource-name resolution. Validation passed: git diff --check, bun run lint, bun run typecheck, bun run test:unit.
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
