---
id: TASK-286
title: >-
  Allow production release deploys to continue when paid Auth0 login
  customization is unavailable
status: Done
assignee: []
created_date: '2026-04-20 19:04'
updated_date: '2026-04-20 19:06'
labels:
  - release
  - auth0
  - hotfix
dependencies: []
references:
  - 'https://github.com/MrLesk/codex-hackathons/actions/runs/24684369406'
  - >-
    https://auth0.com/docs/customize/universal-login-pages/universal-login-page-templates
  - 'https://auth0.com/pricing'
documentation:
  - docs/README.md
  - docs/domain-model.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the Auth0 bootstrap flow used by production releases so the deployment can continue on tenants that do not have the paid Universal Login page-template feature. The release must still apply supported Auth0 settings, but paid-only login customization steps should degrade to warnings instead of aborting the workflow.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Production release bootstrap does not fail when Auth0 returns a paid-feature error for Universal Login page-template customization.
- [x] #2 Supported Auth0 configuration steps still run and continue to fail on real misconfigurations outside the paid-only login customization area.
- [x] #3 Automated tests cover the paid-feature fallback behavior in the Auth0 bootstrap logic.
- [x] #4 Release/deployment docs are updated if the canonical operator workflow or expectations changed.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Introduced a typed Auth0 management request error and wrapped the page-template-dependent Universal Login customization block so `402 Payment Required` on page-template and prompt customization endpoints becomes a warning instead of aborting the bootstrap. Branding, custom domains, client URLs, tenant redirects, and Actions still run normally and still fail on real errors.

Added unit coverage for skippable paid-feature errors and non-skippable Auth0 failures, and documented the new warning-and-continue behavior in the operator and contributor docs.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Auth0 bootstrap now treats paid-plan Universal Login page-template and prompt customization failures as optional. When Auth0 returns `402 Payment Required` for those endpoints, the bootstrap logs a warning and continues with supported Auth0 configuration so production releases can still deploy. Branding, custom domains, callback/origin URLs, tenant redirect settings, and post-login Actions remain enforced and still fail on real misconfiguration. Added unit tests for the fallback behavior and documented the updated deploy expectation in README and DEVELOPMENT.
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
