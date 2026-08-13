---
id: TASK-425
title: Add bearer-authenticated MCP access to Codex Events
status: Done
assignee:
  - '@codex-mcp'
created_date: '2026-08-13 20:08'
updated_date: '2026-08-13 22:15'
labels:
  - backend
  - frontend
  - cloudflare
  - mcp
dependencies: []
references:
  - 'https://learn.chatgpt.com/docs/extend/mcp?surface=cli'
  - >-
    https://developers.cloudflare.com/agents/model-context-protocol/apis/handler-api/
priority: high
type: feature
ordinal: 112000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: every supported structured Codex Events operation is available through a stateless Streamable HTTP MCP endpoint without duplicating domain logic. This is for platform users who want Codex or another MCP client to act on the same data and permissions as the existing web application.

The implementation must introduce a shared application-operation layer used by eligible REST handlers and MCP tools. MCP is only a protocol/authentication/input-output/error adapter; authorization, lifecycle rules, Zod validation, persistence, side effects, auditing, and serialization remain shared application behavior.

Scope includes public discovery and structured signed-in operations across account/profile, events, applications, teams, project submissions, judging, roles, settings, credits, outcomes, Meetup talk proposals, and platform administration. Exclude authentication/account-linking, MCP-token management, account deletion, webhooks, queue/system consumers, and raw binary upload/download operations.

Use agents@0.20.0 and @modelcontextprotocol/server@2.0.0 on Cloudflare Workers. The endpoint is /mcp, Streamable HTTP, stateless, bearer-only, and deployment-host/origin restricted. OAuth, ChatGPT web plugins, scopes, and permanent credentials are outside scope.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Canonical documentation describes MCP entities, contracts, permissions, security rules, testing, deployment, and operator/developer workflows before implementation diverges from product truth.
- [x] #2 Each eligible structured operation has one stable operation ID, shared Zod input/output contracts, one MCP tool, and accurate read-only/destructive/idempotent annotations; registry completeness tests prevent missing or duplicate mappings.
- [x] #3 Eligible REST routes and MCP tools invoke the same operation implementation and produce equivalent response envelopes, side effects, authorization decisions, and sanitized errors.
- [x] #4 GET/POST/DELETE session-authenticated account APIs list, create, and revoke MCP access tokens, and account settings lets a user name, create, copy once, inspect, and revoke credentials.
- [x] #5 Every user can have at most five active tokens; each token expires exactly 30 days after creation, cannot be renewed or made permanent, stores only a secure hash plus display prefix, and is fully shown only at creation.
- [x] #6 The /mcp endpoint rejects cookies and invalid, expired, or revoked credentials; reconstructs the current actor from the token owner on every request; and immediately reflects role and required platform-document acceptance changes.
- [x] #7 Advertised tools are filtered by current coarse capabilities while every invocation rechecks exact event, team, assignment, and lifecycle authorization.
- [x] #8 Configured deployment hosts/origins are enforced and the MCP envelope is rate-limited to 120 requests per token per minute in addition to operation-specific rate limits.
- [x] #9 Last-used timestamps are coalesced, every MCP mutation attempt is audited with token ID, tool name, and outcome, and neither token secrets nor tool arguments are persisted or logged.
- [x] #10 Account deletion removes or revokes all MCP credentials.
- [x] #11 Unit, integration, registry-completeness, REST/MCP parity, and BDD tests cover token lifecycle, protocol initialization/list/call, authorization changes, auditing, account UI, and failure cases.
- [x] #12 README, OPERATOR.md, DEVELOPMENT.md, canonical API/tech-stack docs, D1 migration, Worker bindings, and deployment tooling are updated.
- [x] #13 The full required validation suite passes: lint, typecheck, unit, integration, BDD, Cloudflare build, and git diff check.
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
Execute TASK-425.1 through TASK-425.4 sequentially. Update canonical docs first, then shared operations, token management, MCP transport/security, and final validation/operating guidance. Coordinate shared docs and Cloudflare config edits with the talk-proposals owner; do not commit or push until integration is authorized.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Final evidence: TASK-425.1–425.4 are Done. The independently maintained inventory covers 184 structured routes with 149 eligible operations and 35 explicit exclusions; all 149 tools share their REST executor and recursively constrained Zod contracts, with zero unconstrained output-schema nodes. Token/API/UI, atomic five-active-token enforcement, 30-day expiry, current-actor reconstruction, role-aware discovery, exact guards, pre-auth Host/Origin checks, 120/token/min limiting, coalesced use tracking, redacted mutation auditing, account-deletion cleanup, deployment wiring, docs, and talk-proposal parity are covered.

Final validation: registry 6/6; stable MCP protocol 7/7; lint passed; typecheck passed; unit 121 files/824 tests passed; full escalated integration passed (28 files/379 tests in the final counted run); full escalated BDD passed (58 regular/authenticated scenarios plus the destructive project); Cloudflare production build passed with only existing dependency sourcemap/chunk-size warnings; both MCP generator freshness checks and git diff --check passed.

Compatibility caveat: agents@0.20.0 remains pinned exactly as required, but its published wrapper peers against @modelcontextprotocol/server@2.0.0-beta.5 and is incompatible with the required stable protocol. The production endpoint therefore uses the stable @modelcontextprotocol/server@2.0.0 Cloudflare-compatible handler directly; no fabricated Agents runtime import or compatibility fallback was added.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Delivered secure stateless bearer-authenticated MCP access for all 149 eligible shared operations, including token controls, exact contracts and authorization, role-aware discovery, audit/rate-limit protections, Cloudflare deployment support, documentation, and complete automated validation.
<!-- SECTION:FINAL_SUMMARY:END -->
