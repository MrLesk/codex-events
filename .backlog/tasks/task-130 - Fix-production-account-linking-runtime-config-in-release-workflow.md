---
id: TASK-130
title: Fix production account-linking runtime config in release workflow
status: In Progress
assignee: []
created_date: '2026-03-31 17:24'
updated_date: '2026-03-31 17:25'
labels:
  - production
  - auth0
  - deployment
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Production releases do not publish the Auth0 account-linking runtime configuration required by the same-email Google linking flow. Returning users can be sent into the account-linking path and receive `platform_account_linking_unavailable` because the production Worker lacks the challenge secret and related Auth0 runtime configuration.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Production release workflow publishes the Auth0 account-linking runtime configuration required by the Worker
- [x] #2 Production environment runtime config includes the non-secret Auth0 account-linking values needed at runtime
- [x] #3 The task notes identify any GitHub production secrets that must be added manually before the next release
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added production Worker runtime config for Auth0 account linking in `.github/workflows/release-production.yml` and `wrangler.jsonc`.

Mapped existing production GitHub secrets `AUTH0_MGMT_CLIENT_ID` and `AUTH0_MGMT_CLIENT_SECRET` into Worker runtime secrets and added new production environment secret `NUXT_AUTH0_ACCOUNT_LINK_CHALLENGE_SECRET` via `gh secret set --env production`.

Confirmed production `wrangler` vars now include `NUXT_AUTH0_MANAGEMENT_DOMAIN`, `NUXT_AUTH0_MANAGEMENT_AUDIENCE`, and `NUXT_AUTH0_DATABASE_CONNECTION_NAME`.

Validation: `bun run lint` passed with existing `vue/no-v-html` warnings only; `bun run typecheck` passed; `bun run test:unit` passed.

Canonical docs already documented the required Auth0 env vars, so no doc changes were needed.

Remaining external step: deploy a new production release so the patched workflow can publish the new runtime configuration to Cloudflare.
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
