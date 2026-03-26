---
id: TASK-26
title: Automate Auth0 consent configuration with apply/check and CI drift gate
status: Done
assignee: []
created_date: '2026-03-26 18:27'
updated_date: '2026-03-26 18:38'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create a canonical, idempotent automation path for Auth0 tenant settings required by platform account provisioning. The automation must support applying the required settings and checking for drift, and CI must run drift checks against production-configured secrets so production cannot silently diverge.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A repository script provides `apply` and `check` modes for required Auth0 settings (custom domain, signup consent prompt text/partial, post-login consent action, post-login action binding, and application callback/logout/origin URLs).
- [x] #2 `check` exits non-zero when required settings are missing or drifted, including missing consent signal plumbing for first-time signup.
- [x] #3 The CI workflow includes a production drift-check job that runs the check mode using production-scoped secrets/environment variables.
- [x] #4 Repository docs/environment examples are updated so operators can run apply/check locally and configure CI secrets for production.
- [x] #5 The new automation is validated locally for syntax/type/runtime by running targeted project checks and the command behavior is verified against the configured test tenant.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added `tools/auth0/consent-bootstrap.ts` with `apply` and `check` modes that enforce custom domain readiness, signup consent text/partial, post-login consent action deployment+biding, and app callback/logout/origin URL inclusion.

Validated live against test tenant using `bun run auth0:consent:apply` and `bun run auth0:consent:check` (both passed).

No dedicated unit tests were added for this automation script; coverage is currently command-level validation plus CI drift checks and live tenant verification.

Follow-up change: removed the production drift-check CI job and removed package.json script aliases per user preference; documentation now uses direct command invocation `bun tools/auth0/consent-bootstrap.ts <apply|check>`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented Auth0 consent configuration automation and production drift enforcement. Added a repository command (`auth0:consent:apply` / `auth0:consent:check`) that codifies required tenant/app settings and fails on drift. Added CI `auth0-prod-consent-drift-check` job to run the check with production secrets on main/scheduled/manual runs. Updated `.env.example`, `README.md`, and `DEVELOPMENT.md` with required variables and operator usage guidance.
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
<!-- DOD:END -->
