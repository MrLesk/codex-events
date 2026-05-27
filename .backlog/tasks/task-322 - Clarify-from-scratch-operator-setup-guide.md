---
id: TASK-322
title: Clarify from-scratch operator setup guide
status: Done
assignee: []
created_date: '2026-05-27 20:58'
updated_date: '2026-05-27 21:01'
labels:
  - docs
  - operator-setup
dependencies: []
documentation:
  - OPERATOR.md
  - README.md
  - DEVELOPMENT.md
  - 'https://auth0.com/docs/customize/custom-domains'
  - 'https://developers.cloudflare.com/dns/proxy-status/'
  - 'https://developers.cloudflare.com/r2/data-access/public-buckets/'
  - >-
    https://docs.github.com/actions/deployment/targeting-different-environments/using-environments-for-deployment
modified_files:
  - OPERATOR.md
priority: medium
ordinal: 25000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Rewrite the operator setup guide so a first-time adopter can configure Cloudflare, Auth0, GitHub environments, production deployment, legal setup, and first-admin setup from scratch without relying on legacy environment names or implicit setup knowledge.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 OPERATOR.md includes clear prerequisites for Cloudflare, Auth0, GitHub, and local tooling.
- [x] #2 OPERATOR.md lists required production GitHub environment variables and secrets with canonical current names.
- [x] #3 OPERATOR.md explains Auth0 custom-domain DNS, application, Management API application, and database connection setup in first-read order.
- [x] #4 OPERATOR.md keeps dev and BDD setup separate from production setup and does not document legacy fallback variables.
- [x] #5 Relevant validation passes.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Rewrote OPERATOR.md as a from-scratch production setup guide covering prerequisites, Cloudflare resources, Auth0 tenant/custom-domain/application/Management API setup, canonical GitHub production variables and secrets, optional dev and BDD separation, release deployment, legal setup, first-admin bootstrap, and production verification. The guide explicitly avoids AUTH0_DOMAIN and legacy Management API runtime names, using DEPLOY_AUTH0_CUSTOM_DOMAIN and AUTH0_MANAGEMENT_DOMAIN for the current split. Validation passed: git diff --check and bun run lint.
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
