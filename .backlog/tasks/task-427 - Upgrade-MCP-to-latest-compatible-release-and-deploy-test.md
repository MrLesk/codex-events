---
id: TASK-427
title: Upgrade MCP to latest compatible release and deploy test
status: In Progress
assignee:
  - '@codex-mcp'
created_date: '2026-08-14 06:13'
updated_date: '2026-08-14 06:26'
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
- [ ] #1 package.json and bun.lock use latest compatible agents@0.20.1 and @modelcontextprotocol/server@2.0.0.
- [ ] #2 The /mcp runtime uses createMcpHandler from agents/mcp/server and successfully negotiates MCP protocol 2026-07-28.
- [ ] #3 MCP initialize, tools/list, tools/call, bearer authentication, precise schemas, authorization filtering, auditing, host/origin checks, and rate limiting remain covered and passing.
- [ ] #4 Canonical, operator, and developer documentation describe the latest compatible runtime and remove the obsolete agents@0.20.0 beta-peer caveat.
- [ ] #5 The change passes lint, typecheck, unit, integration, BDD, Cloudflare build, and git diff checks before release.
- [ ] #6 The change is committed and pushed to main, triggering only deploy-test; production deployment is not invoked.
- [ ] #7 The test workflow provisions/reconciles required queues and rate-limit bindings, applies migrations 0071 and 0072 before Worker deployment, completes successfully, and the deployed test MCP endpoint passes a smoke check.
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
<!-- SECTION:NOTES:END -->
