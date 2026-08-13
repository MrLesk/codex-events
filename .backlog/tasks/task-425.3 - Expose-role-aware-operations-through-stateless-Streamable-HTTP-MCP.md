---
id: TASK-425.3
title: Expose role-aware operations through stateless Streamable HTTP MCP
status: Done
assignee:
  - '@codex-mcp'
created_date: '2026-08-13 20:09'
updated_date: '2026-08-13 22:11'
labels:
  - backend
  - cloudflare
  - security
  - mcp
dependencies:
  - TASK-425.1
  - TASK-425.2
modified_files:
  - server/routes/mcp.post.ts
  - server/application/operations
  - server/api
  - tests/integration/server/mcp/mcp-protocol.test.ts
  - .github/workflows/deploy-test.yml
  - .github/workflows/deploy-production.yml
  - tests/unit/tools/deploy/mcp-workflow-config.test.ts
parent_task_id: TASK-425
priority: high
type: task
ordinal: 116000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Expose the shared operation registry from TASK-425.1 through /mcp using agents@0.20.0 and @modelcontextprotocol/server@2.0.0 on the existing Cloudflare Workers/Nitro deployment. The server is stateless Streamable HTTP and accepts only Authorization: Bearer credentials created by TASK-425.2; browser cookies are not authentication at this endpoint.

Create a fresh current actor from the token owner for each request so role changes, deletion, and required platform-document acceptance take effect immediately. Filter tools only by coarse current capabilities for discoverability, then execute the same exact event/team/assignment/lifecycle guards inside each shared operation. Add sanitized protocol/error adaptation, host/origin validation, per-token 120/minute envelope throttling, coalesced last use, and mutation-attempt auditing without secrets or arguments.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The exact SDK versions agents@0.20.0 and @modelcontextprotocol/server@2.0.0 are installed and documented in the canonical tech stack.
- [x] #2 /mcp implements current MCP initialization, tools/list, and tools/call over stateless Streamable HTTP on Cloudflare Workers.
- [x] #3 Authentication is bearer-only; missing, malformed, unknown, expired, revoked, or deleted-user credentials fail without accepting browser cookies or exposing credential details.
- [x] #4 Configured deployment hosts/origins are enforced and a dedicated per-token rate-limit binding enforces 120 MCP envelope requests per minute.
- [x] #5 Actor reconstruction re-reads current user, roles, event roles, and required platform-document acceptance for every request.
- [x] #6 The advertised tool list is coarse-capability filtered, while each call reuses exact shared operation authorization and lifecycle rules.
- [x] #7 One MCP tool is registered for every eligible shared operation with stable name/schema/annotations, and no excluded operation is registered.
- [x] #8 Structured output preserves API envelopes; expected API failures become sanitized MCP errors; successful side effects match REST execution.
- [x] #9 Every mutation attempt records token ID, tool name, outcome, and timestamp without tool arguments or secrets; successful domain audit records remain authoritative.
- [x] #10 Protocol, invalid-auth, capability-change, legal-consent-change, rate-limit, parity, audit, and annotation tests pass.
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
1. Re-register the remediated exact nested output contracts with stable @modelcontextprotocol/server@2.0.0.
2. Verify tools/list advertises constrained schemas and tools/call accepts representative bounded audit metadata while preserving all protocol/security/parity behavior.
3. Run focused MCP protocol and full integration validation, verify criteria, then finalize before reactivating TASK-425.4.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Official Cloudflare docs describe agents/mcp/server with stable server 2.0.0, but the published agents@0.20.0 package metadata peers on 2.0.0-beta.5. Its wrapper rejected stable-server initialization in a protocol test. Runtime therefore uses the stable server package’s Cloudflare-compatible createMcpHandler, which passes initialize/list/call; agents@0.20.0 remains installed at the exact requested version but has no compatible runtime role.

Focused stable-handler protocol verification passed: initialize, tools/list, tools/call; cookie and invalid/revoked credential rejection; configured Host and Origin rejection; per-token rate-limit 429; legal-consent removal immediately removes signed-in tools while preserving public discovery; mutation failure audit records only toolName/outcome. Registry tests cover exact talk inventory, annotations, uniqueness, and exclusions. Typecheck and lint pass.

Cross-review reopened this task behind TASK-425.2. Findings: Host/Origin validation currently occurs after bearer/DB/rate-limit/catalog work and malformed Origin can throw; coarse catalogs rely on inferred capabilities that disagree with guards; tools advertise generic schemas and inaccurate effect annotations. Test/production workflows also omit the documented host/origin environment variables. Required follow-up validates Host and safely parses Origin first, registers exact contracts/policy metadata, and verifies participant/staff/event-admin/platform-admin catalogs.

Activated after TASK-425.2 remediation finalized. The current transport remediation validates Host and safely parses Origin before any cookie/bearer handling, database lookup, rate-limit consumption, last-use write, actor/catalog load; registers exact input/output schemas; uses guard-aligned role catalogs; and audits mutation attempts outside SDK argument validation so malformed mutating calls are still recorded without arguments.

Remediation verification: package.json and bun.lock pin agents 0.20.0 and @modelcontextprotocol/server 2.0.0 exactly. Stable-server initialize/list/call, exact advertised input/output schemas, semantic annotations, bearer/cookie failures, legal-consent changes, current platform-role changes, participant/staff/event-admin/event-organizer/platform-admin catalogs, rate limiting, output/side-effect parity, and secret-free mutation auditing pass in 7 focused protocol tests. Malformed Origin returns sanitized 403 before invalid bearer processing; disallowed/malformed targets do not call the rate limiter or update token lastUsedAt. Test and production workflows now forward both allowlists, covered by 2 unit cases. Focused registry/workflow tests passed 8/8; lint and typecheck passed.

Reopened behind TASK-425.1 precise nested output-schema remediation. Stable protocol registration must be reverified after exact output contracts replace z.json payloads.

Reactivated after precise field-level output contracts finalized in TASK-425.1. Revalidate stable handler tool-list schemas and calls, REST/MCP parity, and exact structured output validation before finalizing.

Precise-output revalidation passed: the stable @modelcontextprotocol/server@2.0.0 handler advertises field-level nested outputSchema values in tools/list, validates exact tool-call structuredContent, and still passes initialize/list/call, bearer rejection, pre-auth Host/Origin, rate-limit, role/legal catalog, parity, and mutation-audit scenarios. Focused protocol 7/7 and full escalated integration 28 files/379 tests pass after exact schema registration.

Final re-review reopened protocol verification: advertised output contracts still contained unconstrained nested objects. Stable tools/list and tools/call coverage must be repeated after exact nested contracts are enforced.

Reactivated after TASK-425.1 eliminated all unconstrained nested schemas and made manifest-driven catalog generation authoritative.

Final nested-contract verification: stable @modelcontextprotocol/server@2.0.0 initialize/list/call and the complete auth, pre-auth target validation, rate limit, capability/legal changes, exact schema, parity, annotation, and redacted audit matrix pass in the focused protocol suite (7/7). Full escalated integration also passes after all 149 tools moved to recursively constrained output contracts.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Revalidated the stable stateless MCP handler against all 149 recursively constrained output contracts. Focused protocol 7/7 and the full escalated integration suite pass, including discovery, calls, security, capability changes, parity, annotations, and audit behavior.
<!-- SECTION:FINAL_SUMMARY:END -->
