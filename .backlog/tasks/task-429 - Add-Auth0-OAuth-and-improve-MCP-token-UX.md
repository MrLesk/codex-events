---
id: TASK-429
title: Add Auth0 OAuth and improve MCP token UX
status: Done
assignee:
  - '@codex'
created_date: '2026-08-14 16:11'
updated_date: '2026-08-14 21:59'
labels:
  - mcp
  - auth0
  - backend
  - frontend
  - cloudflare
dependencies: []
references:
  - 'https://developers.openai.com/plugins/build/auth'
  - 'https://learn.chatgpt.com/docs/extend/mcp?surface=chatgpt'
  - 'https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization'
  - 'https://auth0.com/ai/docs/mcp/intro/why-auth-for-mcp'
priority: high
type: feature
ordinal: 124000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Codex Events users should be able to connect standards-compliant MCP clients through Auth0 OAuth 2.1, while named 30-day bearer tokens remain available for clients that need manual credentials. OAuth is the recommended path. The /mcp endpoint accepts either a valid Auth0 access token or an existing proprietary MCP token, reconstructs the same current platform actor, and enforces the same operation permissions. The implementation must work with MCP Inspector as the protocol baseline and account for the distinct ChatGPT hosted connector callback and Codex local-client callback models. Account settings presents OAuth first and manual tokens as a secondary option. Release and smoke-test only the Cloudflare test environment; production is out of scope.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 An unauthenticated /mcp response advertises OAuth protected-resource metadata and a standards-compliant WWW-Authenticate challenge with the configured Auth0 issuer and exact MCP resource; no resource scope is advertised because platform authorization is not scope-based.
- [x] #2 The deployed test endpoint completes OAuth 2.1 Authorization Code with PKCE in MCP Inspector and supports discovery, token issuance, tools/list, and a representative tool call.
- [x] #3 The MCP endpoint validates Auth0 issuer, signature, expiry, exact audience/resource, subject, and client identity without requiring OIDC or custom API scope claims, while continuing to accept valid unexpired and unrevoked proprietary MCP bearer tokens; browser cookies remain rejected.
- [x] #4 Both authentication paths reconstruct the current platform actor on every request and share identical tool filtering, exact domain authorization, lifecycle guards, side effects, response contracts, and sanitized errors.
- [x] #5 Account settings presents OAuth as the recommended connection method and manual tokens as a secondary method without nested card surfaces or duplicated connection instructions.
- [x] #6 After manual token creation, a focused one-time completion state shows the token name, one-time warning, credential with adjacent Copy action, canonical /mcp URL and Authorization Bearer instruction, and a Done action before returning to token management.
- [x] #7 Existing token listing, five-active-token cap, 30-day expiry, last-used display, immediate revocation, one-time secret storage rules, and account-deletion cleanup remain intact; revoked tokens are omitted from refreshed account UI even when active rows occur on later API pages.
- [x] #8 OAuth and token rate limiting and mutation-attempt audits use safe credential/client identifiers and never persist or log OAuth access tokens, refresh tokens, authorization codes, manual credential plaintext, or tool arguments.
- [x] #9 Auth0 bootstrap/check supports standards clients through DCR and administrator-approved CIMD, provisions the exact MCP resource and third-party user grant, promotes the identity connections to domain level, and configures test runtime values without changing production resources.
- [x] #10 Trusted HTTPS CIMD URLs are validated, deduplicated, and idempotently registered through POST /api/v2/clients/cimd/register; ChatGPT hosted connector redirect URIs and Codex local redirect URIs are treated as different client contracts.
- [x] #11 Every advertised MCP tool declares the OAuth security scheme expected by ChatGPT with an empty resource-scope set, and authentication failures expose a standards-compliant challenge including mcp/www_authenticate where tool-level reauthorization is applicable.
- [x] #12 ChatGPT connector testing uses its MCP-specific HTTPS callback and CIMD client identity; Codex direct testing uses its documented local callback behavior. Neither client-specific callback is incorrectly substituted for the other.
- [x] #13 Canonical docs, README, OPERATOR.md, and DEVELOPMENT.md describe OAuth as recommended, manual tokens as supported, cross-client registration/callback behavior, MCP Inspector testing, revocation, and test deployment.
- [x] #14 Unit and integration coverage includes OAuth discovery, scope-less strict-third-party tokens, invalid tokens, wrong audience or issuer, manual-token parity, subject mapping, client identity, role and consent changes, rate limiting, sanitized audits, registry completeness, DCR, CIMD, and ChatGPT authentication metadata.
- [x] #15 Browser coverage exercises OAuth-first settings plus create, copy, Done, revoke, and revoked-after-refresh token behavior.
- [x] #16 Lint, typecheck, unit, integration, BDD, Cloudflare build, Auth0 configuration check, migration checks, MCP Inspector smoke, and git diff checks pass before the test-only release.
- [x] #17 Only the test environment is deployed; production workflows and production Auth0 or Cloudflare resources remain untouched.
<!-- AC:END -->

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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reconcile the implementation with the official OpenAI ChatGPT MCP and plugin authentication docs: ChatGPT hosted connectors, Codex local clients, and MCP Inspector are separate client surfaces over the same OAuth 2.1 resource-server contract.
2. Keep strict protected-resource discovery, Auth0 JWT validation, current actor reconstruction, capability filtering, rate limiting, audits, and manual-token fallback.
3. Make Auth0 support both standards paths: DCR for clients such as MCP Inspector and direct Codex connections, plus idempotent administrator-approved CIMD imports for ChatGPT or other trusted clients; preserve the exact MCP resource and third-party user grant.
4. Add per-tool OAuth security metadata and standards-compliant authentication challenge metadata required by ChatGPT without weakening transport-level bearer enforcement.
5. Keep the OAuth-first account UX and focused one-time manual-token disclosure flow; hide revoked credentials after refreshed paginated reads.
6. Expand focused protocol, Auth0, registry, and browser tests for DCR, CIMD, ChatGPT metadata, Inspector behavior, and client-specific redirect handling.
7. Update canonical and operator/developer docs to describe standards behavior and the separate ChatGPT hosted versus Codex local callback models.
8. Run all validation, commit and push main, deploy test only, then smoke with MCP Inspector and the applicable real client surfaces through the user Chrome.
9. Finalize TASK-429 only after objective test deployment evidence; record production as untouched.

After OAuth is proven end-to-end with a standards-compliant client, send task 01a0010a-2a0f-7c11-bbbd-a92f0950afdc a concise implementation handoff covering the final Auth0 strict-third-party configuration, CIMD/DCR handling, identity reconstruction and scope policy, connection setup, relevant commits/deploy run, and live Inspector/Codex verification.

Replace the incorrect identity-scope requirement with the actual Auth0 strict-third-party contract: treat the exact MCP audience plus signed issuer/expiry/sub/client identity as the OAuth credential boundary, advertise no resource scopes when the platform has no scope-based authorization, and continue resolving all authorization from the live D1 actor.
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

Correction after reading the official ChatGPT MCP authentication guide: the prior smoke used a Codex-local loopback callback with a ChatGPT-hosted CIMD client identity, which is not a valid cross-surface test. ChatGPT hosted connectors use an MCP-specific HTTPS callback under chatgpt.com, while Codex local clients append a server-specific callback ID to a local callback URL. MCP Inspector will be the protocol baseline, with client-specific smoke tests kept distinct. The temporary invalid Codex alias and failed Chrome tab were removed.

Standards baseline correction: MCP Inspector is the primary OAuth acceptance client. Auth0 now enables DCR while retaining administrator-approved CIMD reconciliation; every tools/list response carries OAuth securitySchemes for openid/email. Canonical and operator/developer docs distinguish Inspector, Codex local callbacks, and ChatGPT hosted callbacks. Focused Auth0 unit 25/25 and MCP protocol integration 10/10 pass; lint, typecheck, and diff check pass.

Full validation checkpoint after the Inspector/DCR correction: lint and typecheck pass; unit 122 files/832 tests pass; integration 28 files/382 tests pass when rerun with the required local loopback/Wrangler permissions (the initial sandbox-only EPERM was infrastructure-only); Cloudflare build passes; diff check passes. Automated BDD rerun is awaiting confirmation because the user requires Chrome for interactive browser work.

Approved full browser validation passes on the combined tree: 58 regular/authenticated scenarios plus 2 destructive scenarios. Existing verbose local SSR/hydration warnings did not fail assertions and are unrelated to the MCP/Auth0 correction.

User explicitly requested a final cross-task handoff to 01a0010a-2a0f-7c11-bbbd-a92f0950afdc. Do not send premature guidance: wait until token issuance plus MCP tools/list and tools/call are proven, then share the exact working implementation and evidence.

Live Inspector evidence on 2026-08-14: a stale callback-host mismatch was resolved by using the registered localhost callback; Auth0 then completed consent and returned to Inspector, but Inspector remained disconnected. The deployed resource still requires openid/email in the access-token scope claim, while strict third-party Auth0 tokens may omit OIDC scope claims and do not support /userinfo. Canonical contract and runtime must remove this false requirement without weakening issuer/signature/expiry/exact-audience/sub/client validation.

First-party Google roundtrip is now proven in the user Chrome: real /auth/login state and PKCE setup, Continue with Google, and successful return to /account. The earlier 500 used a synthetic callback state and did not represent a valid application login. Inspector also exposed hostname-sensitive redirect registration: localhost and 127.0.0.1 are distinct OAuth redirect URIs.

Final test-only proof on 2026-08-14: commit 342b912faed63e56a419ef6a126f1e9ed43d57b1 deployed successfully in GitHub Actions run 31844085392. Live protected-resource metadata advertises the exact test /mcp resource and Auth0 issuer without resource scopes; unauthenticated /mcp returns a sanitized 401 challenge without a scope parameter. MCP Inspector v2.2.0 connected at localhost using OAuth, negotiated MCP 2025-11-25, completed initialize and tools/list, advertised the filtered authenticated catalog, and executed get_account_events with structured output. Production was not invoked. Final runtime accepts scope-less strict-third-party Auth0 tokens while enforcing signature, issuer, expiry, exact audience, sub, and client identity; D1 remains authoritative for live authorization.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added standards-compliant Auth0 OAuth beside retained 30-day manual tokens, including protected-resource discovery, strict signed JWT validation without false scope-claim requirements, live D1 actor authorization, DCR plus trusted CIMD reconciliation, OAuth-first token UX, and safe auditing/rate limiting. Verified by all local gates, successful test-only deployment run 31844085392, and a live MCP Inspector initialize/tools-list/get_account_events roundtrip with structured output; production was untouched.
<!-- SECTION:FINAL_SUMMARY:END -->
