---
id: TASK-427
title: Upgrade MCP to latest compatible release and deploy test
status: Done
assignee:
  - '@codex-mcp'
created_date: '2026-08-14 06:13'
updated_date: '2026-08-14 06:36'
labels:
  - mcp
  - cloudflare
  - deployment
dependencies: []
references:
  - >-
    https://developers.cloudflare.com/agents/model-context-protocol/apis/handler-api/
  - 'https://learn.chatgpt.com/docs/extend/mcp?surface=cli'
modified_files:
  - package.json
  - bun.lock
  - server/routes/mcp.post.ts
  - tests/integration/server/mcp/mcp-protocol.test.ts
  - docs/tech-stack.md
  - docs/mcp.md
  - OPERATOR.md
  - DEVELOPMENT.md
priority: high
type: task
ordinal: 122000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Use the latest currently published MCP stack for Codex Events and deploy it only to the Cloudflare test environment. As of 2026-08-14, npm publishes agents@0.20.1 with peer dependencies @modelcontextprotocol/server@2.0.0 and @modelcontextprotocol/client@2.0.0. MCP server 2.0.0 implements protocol specification 2026-07-28.

Replace the temporary agents@0.20.0 compatibility workaround with agents@0.20.1 and the official agents/mcp/server stateless handler. Keep the current bearer authentication, exact operation contracts, role filtering, rate limits, and host/origin checks. Update documentation so it describes the actual latest runtime without the obsolete beta-peer caveat.

Release only to the configured GitHub test environment. The test deployment must provision/reconcile the talk-decision queue and MCP rate-limit binding, apply D1 migrations 0071 and 0072 before deploying the Worker, and never invoke the production deployment workflow or production resources.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 package.json and bun.lock use latest compatible agents@0.20.1 and @modelcontextprotocol/server@2.0.0.
- [x] #2 The /mcp runtime uses createMcpHandler from agents/mcp/server and successfully negotiates MCP protocol 2026-07-28.
- [x] #3 MCP initialize, tools/list, tools/call, bearer authentication, precise schemas, authorization filtering, auditing, host/origin checks, and rate limiting remain covered and passing.
- [x] #4 Canonical, operator, and developer documentation describe the latest compatible runtime and remove the obsolete agents@0.20.0 beta-peer caveat.
- [x] #5 The change passes lint, typecheck, unit, integration, BDD, Cloudflare build, and git diff checks before release.
- [x] #6 The change is committed and pushed to main, triggering only deploy-test; production deployment is not invoked.
- [x] #7 The test workflow provisions/reconciles required queues and rate-limit bindings, applies migrations 0071 and 0072 before Worker deployment, completes successfully, and the deployed test MCP endpoint passes a smoke check.
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
1. Update canonical MCP and tech-stack documentation first, then operator/developer guidance, to define agents@0.20.1 + @modelcontextprotocol/server@2.0.0, the official stateless Agents handler, and MCP 2026-07-28 without the obsolete prerelease caveat.
2. Upgrade the exact dependency and lockfile, switch only createMcpHandler to agents/mcp/server, and preserve the existing pre-auth Host/Origin, bearer, database, rate-limit, actor/catalog, exact-contract, audit, and shared-operation flow.
3. Update protocol coverage to negotiate and assert 2026-07-28, then run focused MCP/config tests and all required lint, typecheck, unit, integration, BDD, Cloudflare build, and diff checks.
4. Commit and push main, monitor the resulting deploy-test workflow only, and verify from its configuration/logs that the talk-proposal queue, D1 migrations 0071/0072, Worker rate-limit binding, deployment ordering, and queue-consumer reconciliation succeed.
5. Smoke the deployed test /mcp endpoint without exposing credentials, record any authenticated-smoke limitation precisely, then finalize TASK-427 from deployment evidence and leave the repository clean.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Activated for latest-compatible MCP runtime upgrade and test-only Cloudflare deployment. Context risk is L2 because the handler change crosses protocol, bearer security, deployment sequencing, and external test-environment verification; production is explicitly out of scope.

Research completed before implementation: Cloudflare's current handler API and July 2026 changelog direct stateless Workers to createMcpHandler from agents/mcp/server and describe one fresh server per request with MCP 2026-07-28. npm metadata for agents@0.20.1 confirms stable peers @modelcontextprotocol/server@2.0.0 and @modelcontextprotocol/client@2.0.0 plus the ./mcp/server export. The published type declarations confirm the wrapper supports the current handler options and .fetch(request) call. Current deploy-test workflow already orders queue provisioning before D1 migration, Worker deployment, then consumer reconciliation; generated Wrangler config declares MCP_RATE_LIMITER. Production remains explicitly out of scope.

Implementation progress: canonical/operator/developer docs now describe agents@0.20.1, @modelcontextprotocol/server@2.0.0, the official agents/mcp/server handler, and MCP 2026-07-28. package.json/bun.lock are exact-pinned and the runtime changes only the createMcpHandler import. The protocol test now follows the stable SDK's actual negotiation model: server/discover plus per-request metadata successfully selects 2026-07-28 and a modern tools/list succeeds; the legacy initialize/list/call path remains covered. Focused evidence: 23 unit tests and 11 MCP/token integration tests pass; full typecheck passes.

Pre-release validation evidence: lint passed after correcting three quote-style findings in the new test helper; typecheck passed; unit passed 121 files/824 tests; integration passed 28 files/379 tests with required escalation for loopback/Wrangler access; BDD passed 58 standard/authenticated plus 2 destructive scenarios; build:cloudflare completed; git diff --check passed. Build emitted only existing sourcemap/pure-comment/chunk-size warnings. No production command, workflow, resource, release, or tag has been invoked.

Deployment evidence: implementation commit 5b769568558249770f380ddd68508a95c5bb6673 was pushed to origin/main. GitHub deploy-test run 31776321893 completed successfully (backend-checks 5m1s; deploy-test 2m33s). The run verified the talk-proposal decision queue already exists, ran the remote D1 migration command before Worker deployment with no pending migrations, deployed the talk queue producer and MCP_RATE_LIMITER at 120 requests/60s, then reconciled all 4 queue consumers. The immediately preceding test rollout log explicitly marks both 0071_mcp_access_tokens.sql and 0072_talk_proposals.sql applied, and this run's no-pending result confirms the test D1 remains current. The SHA has the expected deploy-test run plus GitHub's automatic dynamic CodeQL analysis; no deploy-production workflow, production resource, release, or tag was invoked. Credential-free remote smoke at https://test.codex-events.com/mcp returned sanitized 401 invalid_mcp_credential for initialize and sanitized 403 mcp_request_target_forbidden for malformed Origin, proving the live route and pre-auth boundary. Test-environment secret names contain no MCP user credential, so authenticated remote initialize/list/call was not possible without creating or exposing a user token; those paths passed the full local integration suite.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Upgraded the stateless MCP runtime to agents@0.20.1 with the official agents/mcp/server handler and stable server 2.0.0, documented the MCP 2026-07-28 negotiation model, and preserved the existing security and shared-operation pipeline. Full local validation passed (824 unit, 379 integration, 60 BDD scenarios, lint, typecheck, Cloudflare build, and diff check). Commit 5b769568 deployed successfully through test workflow 31776321893 with current migrations, talk queue producer/consumers, and MCP rate limiting; live unauthenticated and malformed-Origin smoke checks passed. Authenticated remote smoke remains unavailable because the test environment intentionally has no MCP user credential.
<!-- SECTION:FINAL_SUMMARY:END -->
