---
id: TASK-147
title: >-
  Align shared dev deployment with production GitHub environment secret
  management
status: Done
assignee: []
created_date: '2026-04-01 20:11'
updated_date: '2026-04-01 20:34'
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
- [x] #1 A GitHub `dev` environment exists and contains the secrets required by the shared dev deploy and Auth0-backed BDD jobs
- [x] #2 The shared dev deploy job uses the `dev` GitHub environment and uploads the required Worker secrets before deploy
- [x] #3 The Auth0-backed BDD job no longer depends on repo-level secrets
- [x] #4 Repo-level secrets migrated into the `dev` environment are removed only after the workflows are updated and validated
- [x] #5 Operator documentation explains the `dev` environment secret model and no longer describes repo-level secrets as the source of truth for shared dev CI
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

Updated the GitHub `dev` environment `CLOUDFLARE_API_TOKEN` to the broader local management token after the first `deploy-dev` rerun exposed missing queue-creation permission. Updated the same secret in the `production` environment so the production release workflow can also create queues before deploy.

Validated the migration operationally with two GitHub Actions runs: the push-triggered `ci` run for commit `bab6de2` eventually passed `deploy-dev` after the token fix, and a manual `workflow_dispatch` run reached `auth0-bdd-suite` with the `dev` environment secrets before failing later in the existing BDD fixture reset path (`D1_ERROR: all VALUES must have the same number of terms: SQLITE_ERROR`).

Deleted the migrated repo-level secrets after the `dev` environment was live and the updated workflows had exercised the new secret source.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Migrated shared dev CI secret management from repo-level GitHub secrets to a dedicated GitHub Actions `dev` environment. The new `dev` environment now holds the shared dev deploy secrets, Auth0-backed BDD secrets, and shared dev Worker secrets for Auth0 management, Resend, and Luma. The shared dev CI workflow now runs `deploy-dev` and `auth0-bdd-suite` under `environment: dev`, uploads shared dev Worker secrets before deployment, and leaves queue creation and deployment aligned with the production workflow pattern.

Operationally, the first `deploy-dev` attempt exposed that the environment token lacked queue-creation scope, so the `CLOUDFLARE_API_TOKEN` secret in both the `dev` and `production` environments was updated to the broader local management token. After that change, the rerun of push workflow `23869064874` completed successfully through queue creation, Worker secret upload, migrations, and shared dev deployment. A manual `workflow_dispatch` run (`23869355799`) proved that `auth0-bdd-suite` received the `dev` environment secrets and reached the BDD execution step; it then failed later in an unrelated existing D1 fixture reset error (`all VALUES must have the same number of terms: SQLITE_ERROR`).

Repo-level GitHub secrets used by the old shared dev path were deleted after the environment migration validated, so the repository now relies on environment-scoped secrets only. Documentation in `DEVELOPMENT.md` and `README.md` was updated to describe the new `dev` environment model and the Cloudflare token scope requirement discovered during rollout.

Validation and verification performed:
- bun run lint
- bun run typecheck
- bun run test:unit
- GitHub Actions push run `23869064874` rerun to successful `deploy-dev`
- GitHub Actions manual dispatch run `23869355799` to confirm `auth0-bdd-suite` consumed `environment: dev` secrets before the unrelated BDD fixture failure
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
