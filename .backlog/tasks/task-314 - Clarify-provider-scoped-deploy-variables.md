---
id: TASK-314
title: Clarify provider-scoped deploy variables
status: Done
assignee: []
created_date: '2026-05-26 18:43'
updated_date: '2026-05-26 18:51'
labels: []
dependencies: []
modified_files:
  - .github/workflows/ci.yml
  - .github/workflows/release-production.yml
  - .env.example
  - DEVELOPMENT.md
  - OPERATOR.md
  - README.md
  - tools/deploy/generate-wrangler-config.ts
  - tools/auth0/auth0-custom-domain.ts
  - tests/unit/tools/deploy/generate-wrangler-config.test.ts
priority: high
ordinal: 17000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Rename Cloudflare-owned deploy metadata variables with a DEPLOY_CF prefix, group deployment variables by provider in examples and docs, and restore dev deployment so configured dev environments deploy after pushes while unconfigured environments no-op cleanly.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Cloudflare resource variables use DEPLOY_CF-prefixed names across deploy config generation, CI, production release workflow, Auth0 custom-domain tooling, docs, and tests.
- [x] #2 Deployment example variables are grouped by provider with comments that distinguish app hostnames, Cloudflare resource metadata, Auth0 settings, Luma settings, and runtime bindings.
- [x] #3 The dev deploy job no longer depends on an environment-scoped variable in the job-level condition; it no-ops only when dev deployment is intentionally unconfigured.
- [x] #4 The GitHub dev environment has the variables needed for the next main push to run the dev deployment with the renamed variable names.
- [x] #5 Validation passes for lint, typecheck, and unit tests.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Set GitHub dev environment variables for the shared dev deployment, including DEPLOY_DEV_BASE_DOMAIN, DEPLOY_CF_* Cloudflare resource metadata, Auth0 management settings, outbound email settings, queue binding settings, and optional URL overrides. Verified `bun run deploy:config:dev` locally using the GitHub dev variable values.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Renamed Cloudflare-owned deploy metadata to DEPLOY_CF-prefixed environment variables across the deploy config generator, dev/prod GitHub workflows, Auth0 custom-domain tooling, docs, and unit tests. Grouped deployment variables by provider in `.env.example`, DEVELOPMENT.md, OPERATOR.md, and workflow env blocks, with comments distinguishing app hostnames, Cloudflare resources, Auth0 settings, Luma/public URL overrides, and runtime bindings. Updated the dev deploy workflow so main-branch pushes enter the deploy job and cleanly no-op only when DEPLOY_DEV_BASE_DOMAIN is empty; if dev is configured, missing deploy metadata still fails through the generator. Populated the GitHub `dev` environment variables needed for the next main push and verified local dev config generation from those values. Validation passed: `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `git diff --check`.
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
