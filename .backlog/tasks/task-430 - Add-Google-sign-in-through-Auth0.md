---
id: TASK-430
title: Add Google sign-in through Auth0
status: In Progress
assignee:
  - '@codex'
created_date: '2026-08-14 21:16'
updated_date: '2026-08-14 21:28'
labels: []
dependencies: []
modified_files:
  - tools/auth0/auth0-bootstrap.ts
  - tests/unit/tools/auth0/auth0-bootstrap.test.ts
  - tests/unit/tools/deploy/mcp-workflow-config.test.ts
  - .github/workflows/deploy-test.yml
  - .github/workflows/deploy-production.yml
  - .env.example
  - OPERATOR.md
  - DEVELOPMENT.md
priority: medium
type: feature
ordinal: 125000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add Google as a supported Auth0 Universal Login option for Codex Events and bearer-authenticated MCP OAuth in the test environment, while retaining the existing email/password connection. Reconcile an existing Auth0-managed Google connection as domain-level for the first-party web app and strict third-party MCP clients without reading or changing provider credentials. Keep production untouched until explicitly requested.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Auth0 Universal Login offers Google alongside email/password for the Codex Events web application in test.
- [ ] #2 Strict third-party MCP OAuth clients can use the same Google connection because it is configured as a domain-level connection.
- [ ] #3 The existing Auth0 Google connection retains its provider credentials inside Auth0; deployment automation neither reads, replaces, commits, nor logs them.
- [ ] #4 The test custom-domain Google callback URI and required Google Cloud setup are documented for operators.
- [ ] #5 Existing email/password login, account linking, and platform authorization continue to work.
- [ ] #6 Checked-in Auth0 reconciliation is idempotent and covers configured connection lookup, domain-level promotion, absence, and drift checks.
- [ ] #7 The test deployment succeeds and a live Google login smoke reaches the expected account consent/login path; production is not deployed.
<!-- AC:END -->

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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add an optional AUTH0_GOOGLE_CONNECTION_NAME to tenant configuration and deployment workflows; leave environments without it unchanged.
2. Generalize the existing MCP domain-connection reconciliation so the database identity connection remains required and the configured Google connection is also required/domain-level. Never read or update provider credential options.
3. Add focused unit tests for configuration, idempotent apply/check behavior, missing connections, and safe PATCH payloads.
4. Update operator/developer guidance with Google Cloud callback setup and test-environment configuration.
5. Run the full auth-sensitive validation matrix, commit/push main, set only the test GitHub environment variable, monitor the test deployment, and complete a live Google sign-in/MCP OAuth smoke in the user’s Chrome. Production remains untouched.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
L2 Auth0/deployment change. Discovery found the test tenant already has connection con_YOe6rrjGDxUuVRET named google-oauth2, currently not domain-level. The existing connection owns provider credentials in Auth0; automation can safely reconcile only the connection name and is_domain_connection flag. The existing database-connection domain promotion is the closest implementation pattern. No application route change is expected because Auth0 Universal Login renders enabled domain connections and current account-linking/actor mapping already supports google-oauth2 identities.

Implemented optional AUTH0_GOOGLE_CONNECTION_NAME in Auth0 bootstrap and both deployment workflows. The bootstrap queries only id/name/strategy fields, validates google-oauth2, and PATCHes only is_domain_connection; provider credential options are neither requested nor changed. Added focused config/apply/check/missing/strategy/workflow tests. Set AUTH0_GOOGLE_CONNECTION_NAME=google-oauth2 only on the GitHub test environment; production environment was not changed. Validation so far: focused 30/30, lint, typecheck, unit 122 files/835 tests, elevated integration 28 files/382 tests, Cloudflare build, and diff check pass. Full BDD awaits the user-approved Playwright run.

User approved Playwright for the remainder of this session. Full BDD passed: 58 regular/authenticated scenarios plus 2 destructive scenarios. Existing dev-only D1-binding/hydration warnings did not fail assertions.
<!-- SECTION:NOTES:END -->
