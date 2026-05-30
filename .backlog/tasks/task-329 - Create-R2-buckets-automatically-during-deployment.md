---
id: TASK-329
title: Create R2 buckets automatically during deployment
status: Done
assignee:
  - Codex
created_date: '2026-05-30 14:07'
updated_date: '2026-05-30 14:12'
labels:
  - deployment
  - cloudflare
  - operator-setup
dependencies: []
modified_files:
  - tools/deploy/ensure-r2-buckets.ts
  - tools/deploy/generate-wrangler-config.ts
  - tests/unit/tools/deploy/ensure-r2-buckets.test.ts
  - tests/unit/tools/deploy/generate-wrangler-config.test.ts
  - .github/workflows/ci.yml
  - .github/workflows/release-production.yml
  - package.json
  - OPERATOR.md
  - OPERATOR-ADVANCED.md
  - DEVELOPMENT.md
priority: medium
ordinal: 32000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make deployment create the profile-icons and event-images R2 buckets when they do not already exist, using the same derived resource names and overrides as generated Wrangler config. Remove manual bucket creation from the simple operator setup path.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Deployment automation creates the resolved profile-icons R2 bucket when missing.
- [x] #2 Deployment automation creates the resolved event-images R2 bucket when missing.
- [x] #3 R2 bucket creation is idempotent and safe under concurrent deployment attempts.
- [x] #4 GitHub dev and production deploy workflows run R2 provisioning before Worker deployment.
- [x] #5 Operator docs no longer instruct first-run operators to create the two R2 buckets manually.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend deploy resource-name resolution to expose the profile-icons and event-images R2 bucket names without requiring a resolved D1 ID.
2. Add an idempotent R2 provisioning tool that checks bucket info, creates missing buckets, and rechecks after create races.
3. Run the R2 provisioning tool from dev and production deployment workflows before Worker deployment.
4. Update operator and developer docs so manual R2 bucket creation is no longer part of first-run setup.
5. Validate with targeted tests and the standard repository checks.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented automatic R2 bucket provisioning for deploy targets. The new ensure-r2-buckets tool resolves the same default and override bucket names as generated Wrangler config, checks each bucket with wrangler r2 bucket info --json, creates missing buckets with wrangler r2 bucket create, and handles concurrent create races by re-reading the bucket. Dev and production workflows now run the ensure step before queue setup and Worker deploy scripts also ensure R2 before generating/deploying config. OPERATOR.md no longer asks operators to create the two default buckets manually; advanced and developer docs describe the automatic bucket provisioning and required token commands.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Summary:
- Added automatic R2 bucket provisioning for the resolved profile-icons and event-images bucket names.
- Wired R2 provisioning into dev and production deployment workflows and deploy worker scripts.
- Updated operator/developer docs so the two default R2 buckets are no longer manual first-run setup steps.

Validation:
- git diff --check
- bun run lint
- bun run typecheck
- bun run test:unit
- bun run test:integration

Risks and follow-ups:
- The workflow relies on the existing Cloudflare API token having Workers R2 Storage read and edit access, which OPERATOR.md already documents.
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
