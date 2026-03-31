---
id: TASK-140
title: Fix shared dev account-linking runtime config
status: Done
assignee: []
created_date: '2026-03-31 20:43'
updated_date: '2026-03-31 20:49'
labels:
  - auth0
  - dev
  - account-linking
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The shared dev Cloudflare deployment is missing the Auth0 account-linking runtime configuration that production already requires. /auth/link/login currently fails before the Auth0 reauthentication flow because the dev worker has no challenge secret, no management client runtime secrets, and no dev vars for the management domain, management audience, or password connection name. Add the missing shared dev runtime config and document the requirement so the dev environment can exercise account linking before production rollout.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Add the missing shared dev Auth0 account-linking runtime vars to wrangler.jsonc.
- [x] #2 Set the shared dev worker secrets needed by the account-linking flow.
- [x] #3 Document the shared dev account-linking runtime requirements in contributor docs.
- [x] #4 Validate the repo after the config change and verify the dev worker no longer fails immediately on /auth/link/login.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added the missing shared dev Auth0 account-linking runtime vars to wrangler.jsonc, documented the required shared dev Worker secrets in DEVELOPMENT.md, uploaded the missing dev Worker secrets, redeployed codex-hackathons-dev, and re-applied Auth0 bootstrap so the dev Auth0 app includes both /auth/callback and /auth/link/callback. Existing lint, typecheck, and unit-test suites passed on the checked-in changes, and live verification confirmed the account-linking flow now works on dev. No new automated tests were added because the failure was environment and tenant configuration drift rather than application logic drift.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [x] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
- [x] #9 Shared dev runtime config matches the checked-in deployment model.
<!-- DOD:END -->
