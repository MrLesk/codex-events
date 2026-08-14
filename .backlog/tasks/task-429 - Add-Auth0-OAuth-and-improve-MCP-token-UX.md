---
id: TASK-429
title: Add Auth0 OAuth and improve MCP token UX
status: In Progress
assignee:
  - '@codex'
created_date: '2026-08-14 16:11'
updated_date: '2026-08-14 20:34'
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
- [ ] #1 An unauthenticated /mcp response advertises OAuth protected-resource metadata, and the metadata identifies the configured Auth0 authorization server, canonical MCP resource, and required openid and email identity scopes.
- [ ] #2 Codex can complete Authorization Code with PKCE through the test Auth0 tenant and call the deployed /mcp endpoint with an Auth0 access token.
- [ ] #3 The MCP endpoint validates Auth0 issuer, signature, expiry, exact audience/resource, openid and email identity scopes, subject, and client identity while continuing to accept valid unexpired and unrevoked proprietary MCP bearer tokens; browser cookies remain rejected.
- [x] #4 Both authentication paths reconstruct the current platform actor on every request and share identical tool filtering, exact domain authorization, lifecycle guards, side effects, response contracts, and sanitized errors.
- [x] #5 Account settings presents OAuth as the recommended connection method and manual tokens as a secondary method without nested card surfaces or duplicated connection instructions.
- [x] #6 After manual token creation, a focused one-time completion state shows the token name, explains that the value will not be shown again, places Copy beside the credential, shows the canonical /mcp URL and Authorization Bearer instruction, and provides Done before returning to token management.
- [ ] #7 Existing token listing, five-active-token cap, 30-day expiry, last-used display, immediate revocation, one-time secret storage rules, and account-deletion cleanup remain intact and are covered by tests; revoked tokens are omitted from the refreshed account UI.
- [ ] #8 OAuth and token rate limiting and mutation-attempt audits use safe credential/client identifiers and never persist or log OAuth access tokens, refresh tokens, authorization codes, manual credential plaintext, or tool arguments.
- [ ] #9 Auth0 bootstrap/check and test deployment automation provision the exact MCP resource, mcp third-party user grant, trusted CIMD registration, domain connection, discovery settings, and Worker runtime values without changing production resources.
- [ ] #10 Canonical docs, README, OPERATOR.md, and DEVELOPMENT.md describe OAuth as recommended, manual tokens as supported, their security properties, connection flows, revocation, local testing, and test deployment.
- [ ] #11 Unit and integration tests cover OAuth discovery, valid/invalid/expired/wrong-audience/wrong-issuer/missing-identity-scope tokens, manual-token parity, subject mapping, role/consent changes, rate limiting, sanitized audits, and registry completeness.
- [ ] #12 Browser coverage exercises the improved create/copy/done/revoke token flow, proves revoked tokens stay hidden after refresh, and verifies the OAuth-first account settings presentation; test-environment smoke covers Codex OAuth discovery/login/list/call and manual-token access.
- [ ] #13 Lint, typecheck, unit, integration, BDD, Cloudflare build, Auth0 configuration check, migration checks, and git diff checks pass before the test-only release.
- [ ] #14 Configured trusted HTTPS Codex Client ID Metadata Document URLs are validated, deduplicated, and idempotently registered in Auth0 through POST /api/v2/clients/cimd/register; domain-level connection access and the default third-party user-delegated MCP API grant are reconciled.
- [ ] #15 A deployed test-only smoke uses the exact Codex CIMD URL as client_id with its loopback callback and proves discovery, login, token issuance for the exact MCP audience with openid and email, tools/list, and a tool call; proprietary manual-token access continues to work.
- [ ] #16 Codex's authorization request without the custom mcp permission is reproduced and supported through the explicit canonical contract: Auth0's grant controls resource access, /mcp requires issuer, signature, expiry, exact audience, openid, and email, and no Action injects the unrequested permission.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Canonical docs were updated or confirmed unchanged
- [ ] #2 Code behavior matches canonical docs
- [ ] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [ ] #7 Auth and permissions changes follow the documented platform model
- [ ] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Keep canonical documentation authoritative for dual MCP authentication: OAuth is recommended, manual 30-day tokens remain supported, and only test is released.
2. Keep protected-resource discovery, Auth0 JWT validation, subject mapping, and both credential types in the shared current-actor, capability, rate-limit, audit, and operation pipeline.
3. Configure Auth0 for the exact MCP resource, a default third-party user-delegated grant with permission mcp, trusted administrator-imported Codex CIMD URLs, domain-level identity access, and disabled new DCR.
4. Require valid issuer, signature, expiry, exact MCP audience, subject/client identity, and the Codex-requested identity scopes openid and email; do not require the unrequested mcp permission in the access-token scope claim and do not inject it with an Auth0 Action.
5. Keep the OAuth-first account settings UX and focused one-time manual-token disclosure flow; hide revoked credentials after refreshed paginated reads without changing audit/history storage.
6. Cover CIMD registration, default grants, discovery, OAuth token validation, manual-token parity, security failures, revoked-token filtering, and rendered account flows with focused and full tests.
7. Set the exact trusted Codex CIMD metadata URL only in the GitHub test environment, ensure the test Auth0 automation grant has the required Management API permissions, and leave production configuration/resources unchanged.
8. Run all required validation, commit and push main, monitor only deploy-test, and run Auth0 apply/check in that workflow.
9. Smoke the deployed MCP endpoint through Codex using the CIMD URL client_id, ephemeral loopback callback, requested openid/email scopes, tools/list, and a real tool call in the user’s Chrome; also smoke manual-token access and revoked-token hiding.
10. Finalize TASK-429 with objective test-deployment evidence and a skip-CI bookkeeping commit.
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

Final test-only rollout: GitHub Actions deploy-test run 31833187395 completed successfully (backend checks 4m54s; test deployment 2m49s). The run applied the test Auth0 configuration, confirmed test queues/storage/secrets/migrations, deployed the Worker, and reconciled queue consumers; no production workflow or resource was invoked. Live OAuth smoke completed through Codex with mcp:access and a successful get_events call. Live manual-token smoke in the user's Chrome completed initialize and tools/list from the allowed browser origin with HTTP 200 and the full 149-tool catalog; the temporary credential recorded last use and was immediately revoked. The final origin regression is commit 628a6e478409ddb6a7da32161825531f19afbec8.

User follow-up: revoked credentials should not remain in the account token list after refresh. The API and audit history remain unchanged; only the account UI projection will omit revoked records. Closest analog remains AccountMcpTokensPanel and its existing active-token pagination helper, so no new component is needed.

Urgent interoperability follow-up: the previous OAuth smoke exercised Auth0 dynamic client registration, not the MCP 2026-07-28 CIMD client_id flow. OAuth is not complete until deployment automation idempotently registers explicitly trusted Codex client metadata document URLs, the loopback callback works, and Auth0 grants mcp:access without weakening resource-server validation when Codex omits the custom scope from its authorization request.

CIMD implementation checkpoint: canonical MCP/domain/API/stack/testing docs now make trusted administrator-imported Client ID Metadata Documents the MCP 2026-07-28 path. Auth0 bootstrap validates/deduplicates required HTTPS metadata URLs, requires create:clients, calls the idempotent /api/v2/clients/cimd/register upsert during apply, verifies administrator-managed CIMD records during check, disables new DCR, preserves the domain-level connection and default third-party user grant, denies machine access, and enables offline access. The post-login Action adds mcp:access only for a configured metadata URL targeting the canonical MCP resource; /mcp scope validation is unchanged. Focused Auth0/deployment/token tests 30/30, lint, typecheck, full unit 122 files/833 tests, and diff check pass. The exact Codex metadata URL and live test-only reconciliation/smoke remain pending.

Final interoperability decision from the live Codex/Auth0 trace: Codex requests openid and email for the exact MCP resource but does not request the custom API permission. Auth0 client grants only cap requested API permissions, so the runtime contract is deliberately revised: keep the default third-party user grant with permission mcp, require issuer/signature/expiry/exact audience plus openid and email, and do not require mcp in the access-token scope claim or inject it through an Action. This supersedes the earlier mcp:access-injection checkpoint.

Final local interoperability implementation is green. Runtime and protected-resource metadata now require openid and email for the exact MCP audience; the unrequested custom permission is neither validated nor injected. Auth0 bootstrap keeps permission mcp only in the default third-party user grant, imports trusted CIMD URLs, and disables new DCR. The exact Codex metadata URL is configured only in the GitHub test environment and its document was verified to declare matching client_id plus localhost/127.0.0.1 loopback callbacks. With explicit user approval, create:clients was added to the existing Github Deploy M2M grant in the test tenant only. Final local gates: focused OAuth/Auth0/deployment tests 40/40; lint; typecheck; unit 122 files/832 tests; integration 28 files/382 tests; BDD 58 regular/authenticated plus 2 destructive; Cloudflare build; git diff check. Test deployment and live CIMD smoke remain.
<!-- SECTION:NOTES:END -->
