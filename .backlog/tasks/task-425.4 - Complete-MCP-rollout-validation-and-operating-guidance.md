---
id: TASK-425.4
title: Complete MCP rollout validation and operating guidance
status: Done
assignee:
  - '@codex-mcp'
created_date: '2026-08-13 20:09'
updated_date: '2026-08-13 22:13'
labels:
  - docs
  - testing
  - cloudflare
  - mcp
dependencies:
  - TASK-425.3
modified_files:
  - server/application/operations/eligibility-manifest.ts
  - server/application/operations/generated-catalog.ts
  - server/application/operations/generated-output-schemas.ts
  - tools/mcp/generate-operation-catalog.ts
  - tools/mcp/generate-output-schemas.ts
  - tests/unit/server/application/operations.test.ts
  - server/http/api-response.ts
  - server/database/schema.ts
  - server/database/audit-log.ts
  - docs/mcp.md
  - DEVELOPMENT.md
  - package.json
parent_task_id: TASK-425
priority: high
type: task
ordinal: 117000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Finish the MCP feature as an operable production capability. Close cross-cutting test gaps, update adopter/operator/developer documentation, configure all local/test/production Cloudflare resources, and perform manual client smoke tests.

The root README is for adopters and should mention bearer-authenticated MCP access. OPERATOR.md owns deployment variables, rate-limit resources, migration ordering, monitoring, and rollout. DEVELOPMENT.md owns local token setup and MCP Inspector/Codex testing. Do not add OAuth, ChatGPT web-plugin submission, scopes, permanent tokens, or compatibility fallbacks.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 README describes bearer-authenticated MCP access from an adopter perspective and links to the canonical API/security documentation.
- [x] #2 OPERATOR.md and deployment tooling define the additive D1 migration, MCP rate-limit binding, deployment host/origin configuration, rollout ordering, and monitoring without logging credentials or operation bodies.
- [x] #3 DEVELOPMENT.md documents local token creation and smoke testing with MCP Inspector and Codex.
- [x] #4 Integration tests cover MCP initialize/list/call, invalid/expired/revoked tokens, role/legal-consent changes, REST/MCP output and side-effect parity, token APIs, rate limiting, and mutation audits.
- [x] #5 A registry completeness test proves every eligible structured REST operation has exactly one MCP operation and every MCP tool delegates to a shared operation.
- [x] #6 BDD coverage exercises create/copy/revoke token behavior and representative participant, event-admin, and platform-admin MCP actions.
- [x] #7 Manual smoke tests use participant, event-admin, and platform-admin tokens and record objective results without saving secrets.
- [x] #8 bun run lint, bun run typecheck, bun run test:unit, bun run test:integration, bun run test:bdd, bun run build:cloudflare, and git diff --check all pass.
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
1. Re-read the final MCP docs and combined TASK-425/TASK-426 status after nested-contract and manifest remediation.
2. Re-run the complete post-remediation validation matrix, including BDD and Cloudflare build, and audit status/diff for unintended files.
3. Verify rollout completeness evidence, finalize this subtask, and leave parent TASK-425 In Progress for root integration review.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Activated after TASK-425.3 completed. The stable @modelcontextprotocol/server@2.0.0 handler is validated for initialize/list/call; agents@0.20.0 remains pinned but has no compatible runtime handler role because its published adapter peers against the beta.5 protocol. Rollout work will preserve concurrent TASK-426.4 queue/configuration edits and re-read shared files before final validation.

Progress: adopter, operator, developer, and environment-example guidance now covers the bearer endpoint, token creation/revocation, Inspector and Codex testing, additive 0071 migration ordering, the 120/minute Cloudflare rate binding, host/origin configuration, secret-free monitoring, and rollback. Integration coverage now includes initialize/list/call, invalid/expired/revoked/deleted-owner tokens, dynamic platform-role and legal-consent changes, host/origin and rate limits, REST/MCP mutation output and side-effect parity, and mutation audit redaction. Registry completeness enumerates concrete route files and proves a one-to-one shared-executor mapping, including all ten talk-proposal operations and explicit binary/auth/system/public-mutation exclusions.

BDD: the complete escalated suite passed 55 tests, including account token create/copy/revoke and representative participant, event-admin, and platform-admin MCP calls. Manual smoke: fresh short-lived credentials for regular_user/get_events, event_admin/get_events_by_eventId_roles, and platform_admin/get_platform-admins each returned HTTP 200, isError=false, list-shaped structuredContent; every credential was revoked immediately and neither credentials nor arguments were recorded.

Validation to date: lint, typecheck, unit (120 files/807 tests), escalated integration, escalated BDD (55 tests), Cloudflare production build, and diff check pass. A later talk-proposal BDD failure was traced to a throwing Zod URL refine in the concurrent talk domain, not shared operation transport; TASK-426 owner has patched it and is rerunning before the final shared validation pass.

Final combined validation after TASK-426.4 configuration landed: bun run lint passed; bun run typecheck passed; bun run test:unit passed (120 files, 807 tests); escalated bun run test:integration passed; escalated bun run test:bdd passed; bun run build:cloudflare passed with only existing sourcemap/chunk-size warnings; git diff --check passed. The final unit pass also updated stale queue-reconciliation expectations for the concurrently added talk-proposal queue. No unautomated product test gaps remain; the separate three-role smoke adds direct client evidence beyond the automated protocol and BDD suites.

Known integration constraint: agents@0.20.0 is installed at the required exact version but its published MCP wrapper peers against @modelcontextprotocol/server@2.0.0-beta.5 and advertises an incompatible protocol. The endpoint therefore uses the required stable @modelcontextprotocol/server@2.0.0 createMcpHandler directly. Do not force an Agents wrapper import until a compatible pinned release exists.

Cross-review reopened rollout validation behind TASK-425.3. Findings: deployment workflows do not forward allowed Host/Origin configuration; docs contradict the stable runtime and duplicate the MCP index entry; completeness evidence is not independent of route opt-in; the full validation and three-role smoke must be repeated after contract, capability, transport-ordering, token-concurrency, and UI pagination fixes.

Activated after TASK-425.3 remediation finalized. Rollout validation now needs the full post-remediation matrix, re-read of concurrent TASK-426 files and all ten talk operation headers, and repetition of the three-role smoke without persisting credentials.

Post-review final verification: re-read the concurrent talk schema/config/docs and all ten talk operation headers after TASK-426 remediation; no path, request, response-envelope, capability, or effect metadata changed, so registry regeneration was not required. The explicit 149-included/35-excluded manifest still equals all 184 concrete structured API routes and names every binary/auth/account-token/account-deletion/webhook/system/public-mutation exclusion. Both deployment workflows now forward the Host and Origin allowlists. The repeated three-role smoke is automated in BDD with fresh credentials revoked in finally and no persisted secrets. Final gates: focused registry/workflow 8/8; token and pagination unit 4/4; token/actor/account-cleanup integration 52/52; MCP protocol 7/7; bun run lint passed; bun run typecheck passed; bun run test:unit passed (121 files, 824 tests); escalated bun run test:integration passed; escalated bun run test:bdd passed; bun run build:cloudflare passed with only dependency sourcemap/chunk-size warnings; git diff --check passed. Git status contains the expected combined TASK-425/TASK-426 changes only; AGENTS.md and generated build output are absent.

Reopened after final self-audit: nested MCP output payloads still use z.json(), so the post-remediation exact-output claim and downstream final validation are not objective yet.

Reactivated after precise field-level output schemas and serializer fixes completed. Repeat final lint/typecheck/unit, escalated BDD, Cloudflare build, diff check, and status audit on the combined quiescent TASK-425/TASK-426 tree.

Final exact-output rollout gates on the combined quiescent TASK-425/TASK-426 tree: stable protocol 7/7; bun run lint passed; bun run typecheck passed; bun run test:unit passed (121 files, 824 tests); escalated bun run test:integration passed (28 files, 379 tests); escalated bun run test:bdd passed (57 public/authenticated plus 2 destructive); bun run build:cloudflare passed with only existing dependency sourcemap/chunk warnings; git diff --check passed. Status audit shows only expected combined feature/Backlog changes, no AGENTS.md change, no generated build artifacts, and no retained diagnostic test edits. The field-level schema generator is documented in DEVELOPMENT.md and exposed as bun run mcp:generate-output-schemas.

Final re-review reopened rollout validation: manifest completeness was derived from the generated catalog and exact output schemas still contained 37 unconstrained nested objects, so the completeness and final-gate claims require remediation and rerun.

Reactivated after stable protocol and full integration passed with zero unconstrained output schema nodes and authoritative manifest-driven catalog generation.

Final re-review remediation validation: the independently maintained 184-route manifest (149 includes, 35 explicit exclusions) generates the catalog, and a mutation test proves an omitted eligible loader fails; all 149 output schemas recursively reject unconstrained objects and generator freshness checks pass. Post-remediation gates: registry 6/6; stable MCP protocol 7/7; lint passed; typecheck passed; unit 121 files/824 tests passed; full escalated integration passed; full escalated BDD passed (58 regular/authenticated scenarios plus destructive project); Cloudflare production build passed with only existing dependency sourcemap/chunk-size warnings; git diff --check passed. Status audit shows the expected combined TASK-425/TASK-426 tree only, with no AGENTS.md or build-output changes.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed final MCP rollout remediation with recursively constrained contracts and manifest-authoritative catalog completeness. Stable protocol, lint, typecheck, 824 unit tests, full escalated integration and BDD, Cloudflare build, generator freshness, and diff/status audits pass on the combined tree.
<!-- SECTION:FINAL_SUMMARY:END -->
