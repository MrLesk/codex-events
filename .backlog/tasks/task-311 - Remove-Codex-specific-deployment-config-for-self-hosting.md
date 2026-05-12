---
id: TASK-311
title: Remove Codex-specific deployment config for self-hosting
status: Done
assignee: []
created_date: '2026-05-10 18:34'
labels:
  - open-source-readiness
  - p0
  - deployment
  - cloudflare
dependencies: []
references:
  - wrangler.jsonc
  - .github/workflows/ci.yml
  - .github/workflows/release-production.yml
  - package.json
  - .env.example
  - README.md
  - DEVELOPMENT.md
documentation:
  - docs/README.md
  - docs/tech-stack.md
priority: high
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Open-source readiness P0. Split public local/adopter-safe configuration from deployment-specific Cloudflare/Auth0/Luma/GitHub Actions values so third-party operators are not given Codex-owned domains, tenants, buckets, queue names, sender addresses, D1 IDs, or webhook URLs in tracked deployment config.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Tracked wrangler.jsonc contains only local/adopter-safe defaults and no Codex dev or production deployment blocks.
- [x] #2 Remote dev and production deployment scripts generate Wrangler config explicitly for their target using per-environment base-domain variables, without adding any runtime app environment switch.
- [x] #3 Generated config derives app URL, route pattern, Auth0 custom domain, event image CDN URL, and Luma webhook URL from the selected base domain, with explicit overrides only for Auth0 custom domain, event image CDN URL, and Luma webhook URL.
- [x] #4 GitHub dev and production deploy jobs use environment vars for deployment metadata and secrets for credentials, with no checked-in Codex-specific deploy values.
- [x] #5 README.md, .env.example, and DEVELOPMENT.md document the per-environment base-domain deployment model for adopters/operators.
- [x] #6 Tests cover dev generation, production generation, missing variable errors, and override behavior.
- [x] #7 Validation passes: lint, typecheck, unit tests, targeted generator tests, and an rg check for removed Codex-specific deployment values.
<!-- AC:END -->

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

## Implementation Notes

- Removed checked-in dev and production Cloudflare environment blocks from `wrangler.jsonc`; the tracked file now contains local/adopter-safe bindings only.
- Added explicit dev and production Wrangler config generation under `.wrangler/generated/`, driven by `DEPLOY_DEV_BASE_DOMAIN` or `DEPLOY_PRODUCTION_BASE_DOMAIN`, explicit `DEPLOY_ZONE_NAME`, Cloudflare resource names/IDs, and existing app runtime variables.
- Updated deploy and migration scripts plus GitHub dev/production workflows to generate config before Wrangler commands and to read deployment metadata from GitHub environment variables.
- Updated Auth0 custom-domain DNS automation to use `DEPLOY_ZONE_NAME` explicitly instead of inferring a zone from the Auth0 hostname.
- Updated README, `.env.example`, and DEVELOPMENT.md for the per-environment base-domain deployment model. Product docs were confirmed unchanged because this task changes deployment configuration, not product behavior.

## Validation

- `bunx vitest run tests/unit/tools/deploy/generate-wrangler-config.test.ts tests/unit/tools/auth0-custom-domain.test.ts`
- sample `bun run deploy:config:dev`
- sample `bun run deploy:config:production`
- JSON parse check for `wrangler.jsonc` and generated dev config
- deployment-value `rg` audit against tracked public config, workflows, docs, and deploy tooling
- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`
- `git diff --check`

## Risks

- GitHub environments must be populated with the new `DEPLOY_*` variables before the next dev or production deployment can run.
