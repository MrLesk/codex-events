---
id: TASK-97
title: Set up production domain and GitHub release-driven production pipeline
status: Done
assignee:
  - '@codex'
created_date: '2026-03-29 17:41'
updated_date: '2026-03-29 18:25'
labels: []
dependencies: []
references:
  - wrangler.jsonc
  - .github/workflows/ci.yml
  - tools/auth0/auth0-bootstrap.ts
  - package.json
  - README.md
  - DEVELOPMENT.md
documentation:
  - docs/README.md
  - docs/domain-model.md
  - docs/tech-stack.md
  - docs/testing-strategy.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Set up the production Codex Hackathons deployment so the application runs at https://codex-hackathons.com and Auth0 runs at https://auth.codex-hackathons.com. The work must add a production Cloudflare deployment path alongside the existing dev flow, align Auth0 tenant/application/custom-domain settings with the production host split, and introduce a GitHub Actions release pipeline triggered from a manually created GitHub release. The release tag is the source of truth for the version. The pipeline must derive the package version from the release tag by stripping a leading `v`, use that value consistently where needed during the release, deploy to production with production-scoped GitHub secrets/tokens, and commit the resulting package.json version bump back to main only after a successful production release.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Production Cloudflare configuration exists for the app at `codex-hackathons.com` with production-scoped bindings and deployment commands that do not interfere with local or dev workflows.
- [x] #2 Production Auth0 configuration is automated or aligned for `auth.codex-hackathons.com` as the custom domain and `https://codex-hackathons.com` as the application base URL, including required callback, logout, origin, login URI, tenant redirection, consent flow, and branding settings.
- [x] #3 A GitHub Actions workflow triggered by a manually published GitHub release performs the required validation/build steps, applies production Auth0 alignment, applies production Cloudflare migration/deploy steps, and uses production-only GitHub secrets or environment configuration separate from dev.
- [x] #4 The workflow derives the release version from the GitHub release tag by stripping a leading `v`, uses that release version consistently during the release process, and commits the matching `package.json` version back to `main` only after the production deploy succeeds.
- [x] #5 Operator documentation explains the production domain setup, required production secrets/environment variables, the release workflow trigger, and the post-release version write-back behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a production deployment path in wrangler.jsonc and package.json that is isolated from the current local and dev flows, including production-scoped Cloudflare bindings and deploy/migration commands.
2. Add a release-version helper plus unit coverage so the release workflow derives the canonical package version by stripping a leading v from the GitHub release tag and can apply that version consistently during release automation.
3. Add a dedicated GitHub Actions workflow triggered on release.published, bound to a new production environment, that runs validation/build steps, aligns Auth0, applies Cloudflare migrations/deploys, and commits the successful package.json version bump back to main.
4. Create the GitHub production environment and define the production secret contract for Cloudflare, Auth0, and runtime configuration so production remains isolated from repo-level dev/test secrets.
5. Provision the production Cloudflare resources and DNS that can be safely created now for codex-hackathons.com and the production Worker deployment path.
6. Wire Auth0 bootstrap and documentation for the isolated production tenant/client/custom-domain contract at auth.codex-hackathons.com and https://codex-hackathons.com, using production-specific secrets and settings.
7. Update operator documentation to describe the production domain setup, release trigger, required production secrets, and post-release version write-back behavior.
8. Validate with lint, typecheck, unit tests, integration tests, and targeted release/config checks before handoff.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Created GitHub `production` environment and stored production-scoped secrets for Cloudflare, Auth0 app client, Auth0 management client, session secret, and Resend runtime values.

Provisioned production Cloudflare resources: D1 database `codex-hackathons` was already present, and R2 buckets `codex-hackathons-profile-icons` / `codex-hackathons-hackathon-images` plus queue `codex-hackathons-application-review-email-delivery` were created.

Created the production Auth0 Regular Web Application `Codex Hackathons` and Machine to Machine Application `Codex Hackathons Management` in tenant `codex-hackathons.eu.auth0.com`, then wired their credentials into the GitHub `production` environment.

Added automated first-release Auth0 custom-domain provisioning and Cloudflare DNS verification so the production release can create `auth.codex-hackathons.com`, publish the required DNS-only CNAME, and wait for Auth0 verification/certificate readiness before the main bootstrap runs.

Live validation shows the new production tenant currently rejects Auth0 custom-domain creation with `403 operation_not_supported` and message `There must be a verified credit card on file to perform this operation`. Production app deployment is ready, but Acceptance Criterion 2 remains blocked until billing is added in Auth0 and the release is rerun.

Validation status: `bun run typecheck`, `bun run test:unit`, `bun run test:integration`, and targeted eslint on the new Auth0 custom-domain files passed. Full `bun run lint` is currently blocked by a pre-existing unrelated error in `app/components/account/hackathons/AccountHackathonAdminOperationsPanel.vue:576` plus existing `vue/no-v-html` warnings in static content pages.

Committed and pushed the repo changes to `main` in commit `d08f832` (`TASK-97 - Set up production domain and GitHub release-driven production pipeline`).

Updated local and deployed sender addresses from `noreply@dev.codex-hackathons.com` to `noreply@codex-hackathons.com` so Resend can use the single free-plan domain across environments. Applied the new sender address to local `.env`, the shared dev Worker secrets, and the GitHub `production` environment secrets.

After billing was added and the custom domain was created in Auth0, `bun run auth0:custom-domain` succeeded against production and confirmed `auth.codex-hackathons.com` is verified, certificate-provisioned, and already matched by the Cloudflare DNS-only CNAME record.

The production tenant initially failed the bootstrap consent-partials step because Universal Login had no page template configured. Updated `tools/auth0/auth0-bootstrap.ts` so `apply` now creates the default Universal Login page template when the tenant does not have one yet, then continues with canonical consent partial setup.

Live production Auth0 alignment now passes end to end: `bun tools/auth0/auth0-bootstrap.ts apply` followed by `check` succeeded against tenant `codex-hackathons.eu.auth0.com` with app client `gdzB8u2BcXf1vC1JCes5HrDATXVJERaF`. Final live steps created the default Universal Login page template, canonical signup consent partials, reset-password copy, post-login action, and action binding.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Production setup is now complete. The repo has a release-driven production workflow, production Cloudflare bindings and commands, and release-tag version sync back to `main`. Live provider setup now matches that automation: the production Auth0 tenant has verified billing, `auth.codex-hackathons.com` is ready, the production Auth0 application/bootstrap passes `apply` + `check`, the GitHub `production` environment holds the required secrets, and the shared Resend sender domain was normalized to `codex-hackathons.com` for both dev and production contexts.
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
