---
id: TASK-147
title: >-
  Align shared dev deployment with production GitHub environment secret
  management
status: In Progress
assignee: []
created_date: '2026-04-01 20:11'
updated_date: '2026-04-01 20:22'
labels: []
dependencies: []
references:
  - /Users/alex/projects/codex-hackathons/.github/workflows/ci.yml
  - >-
    /Users/alex/projects/codex-hackathons/.github/workflows/release-production.yml
  - /Users/alex/projects/codex-hackathons/wrangler.jsonc
documentation:
  - /Users/alex/projects/codex-hackathons/DEVELOPMENT.md
  - /Users/alex/projects/codex-hackathons/README.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create a dedicated GitHub `dev` environment for the shared dev deployment path, move the dev- and BDD-related GitHub Actions secrets out of repo-level storage, update CI jobs to consume `dev` environment secrets, and make the shared dev deploy workflow upload Worker secrets in the same style as production before removing the old repo-level secrets.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A GitHub `dev` environment exists and contains the secrets required by the shared dev deploy and Auth0-backed BDD jobs
- [ ] #2 The shared dev deploy job uses the `dev` GitHub environment and uploads the required Worker secrets before deploy
- [ ] #3 The Auth0-backed BDD job no longer depends on repo-level secrets
- [ ] #4 Repo-level secrets migrated into the `dev` environment are removed only after the workflows are updated and validated
- [ ] #5 Operator documentation explains the `dev` environment secret model and no longer describes repo-level secrets as the source of truth for shared dev CI
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create a GitHub `dev` environment and seed it with the current repo-level CI secrets plus the additional shared-dev Worker secret values needed for deploy (`NUXT_AUTH0_MANAGEMENT_CLIENT_ID`, `NUXT_AUTH0_MANAGEMENT_CLIENT_SECRET`, `NUXT_AUTH0_ACCOUNT_LINK_CHALLENGE_SECRET`, `NUXT_RESEND_*`, `NUXT_LUMA_API_KEY`). Use the shared dev Auth0 tenant management credentials from `AUTH0_TEST_MGMT_CLIENT_*`, treat `NUXT_AUTH0_AUDIENCE` as empty when unset, and rotate the account-link challenge secret to a new generated value.
2. Update `.github/workflows/ci.yml` so `deploy-dev` and `auth0-bdd-suite` run against `environment: dev`, and make `deploy-dev` upload the shared dev Worker secrets via `wrangler secret bulk` before migrations and deploy, matching the production release pattern.
3. Update operator docs in `DEVELOPMENT.md` and `README.md` so shared dev secrets are described as GitHub `dev` environment secrets rather than repo-level secrets, and document that the dev deploy workflow syncs Worker secrets automatically.
4. Run the required repository validation commands.
5. After the workflow and environment configuration are in place, delete the now-migrated repo-level secrets so `dev` becomes the source of truth for shared dev CI.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Created the GitHub Actions `dev` environment through `gh` and seeded it from local sources with the existing repo-level CI secrets plus shared-dev Worker secrets for Auth0 management, Resend, and Luma. The dev account-link challenge secret was rotated to a new generated value and stored only in the `dev` environment.

Confirmed the shared dev Auth0 tenant host in local configuration is `codex-hackathons-dev.eu.auth0.com`, so `AUTH0_TEST_MGMT_CLIENT_ID` and `AUTH0_TEST_MGMT_CLIENT_SECRET` are the correct source for the shared dev runtime management credentials.

Local validation passed after the workflow and docs patch: `bun run lint`, `bun run typecheck`, `bun run test:unit`. The remaining operational validation is the pushed `deploy-dev` run and a manual or scheduled `auth0-bdd-suite` run after the workflow switches to the `dev` environment.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Canonical docs were updated or confirmed unchanged
- [ ] #2 Code behavior matches canonical docs
- [ ] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [ ] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [ ] #7 Auth and permissions changes follow the documented platform model
- [ ] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
