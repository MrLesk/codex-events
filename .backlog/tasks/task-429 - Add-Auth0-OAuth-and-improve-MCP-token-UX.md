---
id: TASK-429
title: Add Auth0 OAuth and improve MCP token UX
status: In Progress
assignee:
  - '@codex'
created_date: '2026-08-14 16:11'
updated_date: '2026-08-14 19:23'
labels:
  - mcp
  - auth0
  - backend
  - frontend
  - cloudflare
dependencies: []
references:
  - 'https://learn.chatgpt.com/docs/extend/mcp?surface=cli'
  - 'https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization'
  - 'https://auth0.com/ai/docs/mcp/intro/why-auth-for-mcp'
priority: high
type: feature
ordinal: 124000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Codex Events users should have two supported ways to connect an MCP client. Auth0 OAuth is the recommended path for clients such as Codex that support browser authorization; named 30-day bearer tokens remain available for clients that need manual credentials. The /mcp endpoint accepts either a valid Auth0 OAuth access token or an existing proprietary MCP token, reconstructs the same current platform actor, and enforces the same operation permissions. Account settings presents OAuth first and manual tokens as a secondary option. Token creation uses a focused one-time completion state modeled on the supplied reference: token name as context, an explicit one-time warning, the credential with adjacent copy action, the canonical MCP URL and Authorization header instruction, and a clear Done action separate from the credential list. Release and smoke-test only the Cloudflare test environment; production is out of scope.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 An unauthenticated /mcp response advertises OAuth protected-resource metadata, and the metadata identifies the configured Auth0 authorization server, canonical MCP resource, and required scope.
- [ ] #2 Codex can complete Authorization Code with PKCE through the test Auth0 tenant and call the deployed /mcp endpoint with an Auth0 access token.
- [ ] #3 The MCP endpoint validates Auth0 issuer, signature, expiry, audience/resource, and required scope, while continuing to accept valid unexpired and unrevoked proprietary MCP bearer tokens; browser cookies remain rejected.
- [ ] #4 Both authentication paths reconstruct the current platform actor on every request and share identical tool filtering, exact domain authorization, lifecycle guards, side effects, response contracts, and sanitized errors.
- [ ] #5 Account settings presents OAuth as the recommended connection method and manual tokens as a secondary method without nested card surfaces or duplicated connection instructions.
- [ ] #6 After manual token creation, a focused one-time completion state shows the token name, explains that the value will not be shown again, places Copy beside the credential, shows the canonical /mcp URL and Authorization Bearer instruction, and provides Done before returning to token management.
- [ ] #7 Existing token listing, five-active-token cap, 30-day expiry, last-used display, immediate revocation, one-time secret storage rules, and account-deletion cleanup remain intact and are covered by tests.
- [ ] #8 OAuth and token rate limiting and mutation-attempt audits use safe credential/client identifiers and never persist or log OAuth access tokens, refresh tokens, authorization codes, manual credential plaintext, or tool arguments.
- [ ] #9 Auth0 bootstrap/check and test deployment automation provision the MCP API/resource configuration, required scope, client registration/access policy, discovery settings, and Worker runtime values without changing production resources.
- [ ] #10 Canonical docs, README, OPERATOR.md, and DEVELOPMENT.md describe OAuth as recommended, manual tokens as supported, their security properties, connection flows, revocation, local testing, and test deployment.
- [ ] #11 Unit and integration tests cover OAuth discovery, valid/invalid/expired/wrong-audience/wrong-issuer/missing-scope tokens, manual-token parity, subject mapping, role/consent changes, rate limiting, sanitized audits, and registry completeness.
- [ ] #12 Browser coverage exercises the improved create/copy/done/revoke token flow and verifies the OAuth-first account settings presentation; test-environment smoke covers Codex OAuth discovery/login/list/call and manual-token access.
- [ ] #13 Lint, typecheck, unit, integration, BDD, Cloudflare build, Auth0 configuration check, migration checks, and git diff checks pass before the test-only release.
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
1. Update canonical MCP, domain, schema, API, permissions, testing, and stack documentation so OAuth is recommended and manual tokens remain a supported secondary credential.
2. Add MCP protected-resource discovery and Auth0 JWT verification, map OAuth subjects to platform accounts, and route both OAuth and manual credentials into the existing current-actor, capability, rate-limit, audit, and shared-operation pipeline.
3. Extend Auth0 bootstrap/check plus Worker/deployment configuration for the MCP resource server, scope, client registration/access policy, and local/test runtime values.
4. Redesign account MCP settings around an OAuth-first connection section and a secondary token manager; move one-time token disclosure into a focused completion state matching the supplied reference and reuse existing App components.
5. Add focused OAuth/discovery/security/parity tests and browser coverage for OAuth-first settings plus create/copy/done/revoke.
6. Run the full validation suite, commit and push main, monitor only deploy-test, apply Auth0 test configuration, and smoke both OAuth and manual-token connections without invoking production.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Architecture scope is L2. The user explicitly selected dual authentication: OAuth is recommended and manual 30-day tokens remain fully supported. D1 remains authoritative for platform accounts, roles, event permissions, and legal-document acceptance. Release scope is test only. The supplied screenshots are visual references, not instructions.

Implementation checkpoint: canonical docs now define OAuth-first dual authentication. Runtime accepts existing ce_mcp manual tokens or Auth0 JWTs through one actor/operation pipeline; protected-resource metadata and WWW-Authenticate discovery are implemented. OAuth verifies issuer, signature, expiry, audience, scope, subject, and client identity with jose; rate limiting and mutation audits use safe method-specific identifiers. Account settings has an OAuth-first connection section and focused manual-token create/copy/Done state. Auth0 bootstrap/runtime/deploy configuration work is in progress.

Local implementation validation is green: OAuth discovery and JWT verification unit coverage; dual-auth MCP protocol integration 10/10; Auth0/deployment configuration unit matrix 35/35; full lint and typecheck; full unit 122 files/829 tests; full integration 28 files/382 tests; full browser suite 58 regular/authenticated plus 2 destructive scenarios, including OAuth-first settings and create/copy/Done/revoke; Cloudflare build; MCP generator freshness; and git diff checks. The built Worker contains the protected-resource discovery route. Remote Auth0 apply/check and real Codex OAuth smoke remain gated on the test-only deployment.

Test deployment run 31820537533 initially stopped before migrations/deploy because the existing Auth0 automation client lacked the newly required Management API scopes. The test tenant grant was updated with exactly those eight scopes. The rerun then exposed Auth0 tenant-settings PATCH rejecting read-only flags echoed from the GET response; the update payload now contains only the supported MCP settings, with a regression test using the reported disable_impersonation and allow_changing_enable_sso flags. Lint, typecheck, the 22-test Auth0 bootstrap unit file, and diff check pass for the fix.

The next test apply created the MCP resource server and default grant, enabled DCR/CIMD/resource settings, and made the database connection domain-wide. Auth0 then omitted dynamic_client_registration_security_mode from GET despite accepting the PATCH. A temporary test-only DCR probe produced a tpc_ client with third_party_security_mode=strict, authorization_code+refresh_token, PKCE/public token endpoint; that exact temporary client was deleted immediately. Bootstrap now creates the default third-party grant before tenant DCR settings and accepts Auth0's documented strict-default omission while still rejecting explicit permissive mode. Lint, typecheck, the 22-test Auth0 bootstrap unit file, and diff check pass.

Live Codex OAuth exposed that the Auth0 consent grant had an empty scope: the MCP resource server enabled Auth0 RBAC even though platform authorization is owned by D1, so Auth0 stripped mcp:access from an otherwise successful user-delegated token. Canonical and operator docs now make the boundary explicit; the resource server uses RFC 9068 without Auth0 RBAC while the strict third-party default grant continues to authorize only mcp:access. Focused Auth0 bootstrap tests 22/22, lint, typecheck, and diff check pass.

Chrome manual-token smoke created TASK-429 smoke test, then an authenticated browser-origin request reached the Agents handler but was rejected there because the configured host/origin allowlists were only applied by the outer route. The temporary credential showed a coalesced last-used timestamp and was revoked immediately. The handler now receives the same allowedHostnames and allowedOriginHostnames, with an integration regression proving an allowed custom browser origin succeeds while malformed/disallowed targets still fail before rate limiting. Focused MCP protocol integration 10/10, lint, typecheck, unit 122 files/829 tests, and diff check pass.
<!-- SECTION:NOTES:END -->
