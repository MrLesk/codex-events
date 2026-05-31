---
id: TASK-340
title: Automate generated Auth0 deployment secrets
status: Done
assignee: []
created_date: '2026-05-31 09:50'
updated_date: '2026-05-31 09:59'
labels:
  - deployment
  - documentation
  - operator-setup
  - auth0
dependencies: []
modified_files:
  - .github/workflows/ci.yml
  - .github/workflows/release-production.yml
  - .env.example
  - OPERATOR.md
  - OPERATOR-ADVANCED.md
  - DEVELOPMENT.md
  - tools/auth0/auth0-bootstrap.ts
  - tools/auth0/generated-secrets.ts
  - tools/deploy/write-worker-secrets.ts
  - tests/unit/tools/auth0/auth0-bootstrap.test.ts
  - tests/unit/tools/auth0/generated-secrets.test.ts
  - tests/unit/tools/deploy/write-worker-secrets.test.ts
priority: medium
ordinal: 43000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Remove the basic-operator requirement to generate opaque Auth0 runtime secrets locally. Deployment workflows should resolve stable generated values automatically from the existing Auth0 application client secret when explicit override secrets are not provided, while keeping advanced operators able to supply custom values.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The basic operator guide no longer lists local openssl or another random generator as a prerequisite.
- [x] #2 Production and shared dev deploy workflows upload non-empty NUXT_AUTH0_SESSION_SECRET and NUXT_AUTH0_ACCOUNT_LINK_CHALLENGE_SECRET values even when those GitHub secrets are omitted.
- [x] #3 The Auth0 bootstrap configuration uses the same account-link challenge secret as the Worker runtime when the explicit account-link secret is omitted.
- [x] #4 Advanced/development docs explain generated defaults and when to set explicit overrides.
- [x] #5 Relevant tool tests cover generated secret resolution and mismatch handling.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a small Auth0 generated-secret helper that deterministically derives labeled deployment secrets from the existing Auth0 application client secret and rejects mismatched explicit account-link values.
2. Add a deployment tool that writes the Worker secret-bulk JSON, deriving NUXT_AUTH0_SESSION_SECRET and NUXT_AUTH0_ACCOUNT_LINK_CHALLENGE_SECRET when their GitHub secrets are omitted and merging any Luma webhook secret file.
3. Update production and shared dev workflows to use the deployment tool instead of hand-written jq secret JSON and update Auth0 bootstrap to derive the same account-link challenge secret when no explicit value is provided.
4. Update OPERATOR.md so basic operators no longer need local openssl or manual generated secrets; update advanced/development docs to describe optional overrides/manual local generation.
5. Add focused unit tests for generated secret derivation, Worker secret JSON writing, Auth0 bootstrap fallback, and explicit mismatch handling; run focused tests plus docs/code validation before committing only task-related files.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented generated Auth0 secret resolution with a shared tools helper. Deploy workflows now write Worker secret-bulk JSON through the checked-in tool, and Auth0 bootstrap derives the same account-link challenge secret when the explicit secret is omitted. Focused tests passed: generated secret helper, Worker secret writer, and Auth0 bootstrap config.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Automated generated Auth0 runtime secret handling for deployment. Production and shared dev workflows now write Worker secret-bulk JSON through a checked-in tool that derives stable NUXT_AUTH0_SESSION_SECRET and NUXT_AUTH0_ACCOUNT_LINK_CHALLENGE_SECRET values from NUXT_AUTH0_CLIENT_SECRET when explicit override secrets are omitted. Auth0 bootstrap resolves the same account-link challenge value, and the BDD workflow derives its session secret when the explicit BDD secret is omitted.

Updated OPERATOR.md to remove the local openssl prerequisite and the generated-secret rows from the basic production secret table. OPERATOR-ADVANCED.md, DEVELOPMENT.md, and .env.example now document generated defaults and optional explicit overrides. Added focused tests for generated secret derivation, Worker secret JSON writing, Auth0 bootstrap fallback, and mismatch handling.

Validation passed: focused tool tests, bun run lint, bun run typecheck, bun run test:unit, bun run test:integration, git diff --check. BDD was not run locally because the suite requires configured external Auth0 personas; the workflow-only BDD change is covered by the shared generated-secret helper tests.
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
