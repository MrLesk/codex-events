---
id: TASK-314
title: Clarify provider-scoped deploy variables
status: Done
assignee: []
created_date: '2026-05-26 18:43'
updated_date: '2026-05-26 19:03'
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

Post-push Actions run 26468440732 reached the deploy-dev job and failed at `Apply shared dev D1 migrations` because Wrangler resolved generated `migrations_dir: drizzle` relative to `.wrangler/generated/dev.jsonc`. Updated generated deployment configs to use `../../drizzle` and added unit coverage for the generated migration path.

Second post-push Actions run 26468738522 passed D1 migrations and failed in `Deploy shared dev environment` because Wrangler also resolved generated `main` and asset paths relative to `.wrangler/generated/dev.jsonc`. Updated generated configs to use `../../.output/server/index.mjs` and `../../.output/public`. Local `wrangler deploy --config .wrangler/generated/dev.jsonc --dry-run` now builds and validates the generated Worker paths and bindings successfully.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Renamed Cloudflare-owned deploy metadata to DEPLOY_CF-prefixed environment variables across the deploy config generator, dev/prod GitHub workflows, Auth0 custom-domain tooling, docs, and unit tests. Grouped deployment variables by provider in `.env.example`, DEVELOPMENT.md, OPERATOR.md, and workflow env blocks, with comments distinguishing app hostnames, Cloudflare resources, Auth0 settings, Luma/public URL overrides, and runtime bindings. Updated the dev deploy workflow so main-branch pushes enter the deploy job and cleanly no-op only when DEPLOY_DEV_BASE_DOMAIN is empty; if dev is configured, missing deploy metadata still fails through the generator. Populated the GitHub `dev` environment variables needed for the next main push and verified local dev config generation from those values. Validation passed: `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `git diff --check`.

Follow-up after the first post-push deploy: run 26468440732 confirmed `deploy-dev` was no longer skipped, then failed because Wrangler resolved `migrations_dir` relative to the generated config directory. The generator now emits `../../drizzle`, and the unit test asserts that path. Validation passed again after this fix: `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `git diff --check`.

Second follow-up: run 26468738522 passed the D1 migration step and exposed the remaining generated-config path issue for Worker `main` and assets. The generator now emits repo-root-relative paths for `main`, assets, and migrations from the generated config location. Local `wrangler deploy --config .wrangler/generated/dev.jsonc --dry-run` succeeds, and validation passed again: `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `git diff --check`.
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
