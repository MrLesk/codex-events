---
id: TASK-425.1
title: Define MCP product contracts and shared application operations
status: Done
assignee:
  - '@codex-mcp'
created_date: '2026-08-13 20:09'
updated_date: '2026-08-13 22:09'
labels:
  - backend
  - docs
  - mcp
dependencies: []
modified_files:
  - server/http/api-response.ts
  - server/database/schema.ts
  - server/database/audit-log.ts
  - server/domains/applications/luma-sync-queue.ts
  - server/domains/applications/review-finalization.ts
  - server/application/operations/eligibility-manifest.ts
  - server/application/operations/generated-catalog.ts
  - server/application/operations/generated-output-schemas.ts
  - tools/mcp/generate-operation-catalog.ts
  - tools/mcp/generate-output-schemas.ts
  - tests/unit/server/application/operations.test.ts
  - docs/mcp.md
  - DEVELOPMENT.md
  - package.json
parent_task_id: TASK-425
priority: high
type: task
ordinal: 114000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Start by updating the canonical documentation for bearer-authenticated MCP access, then introduce the shared application-operation boundary that both REST and MCP will use. A new contributor should treat docs/ as product truth and must not put authorization or business rules in the MCP adapter.

Inventory every structured REST operation. Mark operations eligible when they are public discovery or signed-in structured JSON work in account/profile, events, applications, teams, project submissions, judging, roles, settings, credits, outcomes, talk proposals, or platform administration. Exclude authentication/account linking, MCP-token management, account deletion, webhooks, queue/system consumers, and raw binary transfers.

Each eligible operation needs a stable ID, shared Zod input/output schemas, annotations, an executor using existing guards/domain functions/serializers/side effects, and exactly one REST binding. Preserve existing response envelopes and error semantics.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 docs/domain-model.md, lifecycle-and-state-machines.md, permissions-matrix.md, schema-outline.md, api-surface.md, tech-stack.md, and testing-strategy.md define MCP tokens, operation eligibility, permissions, security, auditing, parity, and validation as current product truth.
- [x] #2 An explicit eligibility inventory covers all structured routes in scope and records the excluded categories without using a catch-all compatibility path.
- [x] #3 A shared operation registry exposes stable operation IDs, Zod input/output contracts, capability metadata, and read-only/destructive/idempotent annotations.
- [x] #4 Every eligible REST handler delegates to the registered shared operation rather than retaining duplicate authorization, domain, side-effect, or serialization logic.
- [x] #5 Operation execution preserves existing API envelopes and sanitized errors.
- [x] #6 Tests prove operation IDs are unique and each eligible REST operation has exactly one registry entry.
- [x] #7 Focused tests plus lint/typecheck/unit checks for this slice pass and progress is recorded in Backlog.
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
1. Remove broad output types by inferring concrete pagination metadata and modeling dynamic audit metadata as explicitly bounded JSON; make schema generation reject unconstrained nodes and test all 149 schemas recursively.
2. Make the independently maintained 184-route include/exclude manifest authoritative with reviewed exclusion reasons; generate/check the 149-operation catalog from it.
3. Add mutation-style freshness/completeness tests proving an omitted eligible catalog binding fails.
4. Run focused registry/schema/manifest tests, typecheck, and unit validation; verify TASK-425.1 criteria before reactivating TASK-425.3.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Research completed 2026-08-13: inspected the H3 API-handler/error/validation boundary, actor reconstruction and consent checks, domain guard patterns, D1/Drizzle schema and audit logging, Cloudflare rate-limit/local-binding patterns, deployment generator, account settings composition, and existing route/integration tests. Official Cloudflare documentation confirms agents/mcp/server createMcpHandler is the stateless SDK-v2 handler, creates a fresh server per request, supports explicit allowed host/origin restrictions, and @modelcontextprotocol/server@2.0.0; the Workers rate-limit binding uses a stable string key with a 60-second period and is permissive/eventually consistent. Official ChatGPT MCP guidance was reviewed for remote-server tool behavior and client setup. Context risk: L2 because this spans public contracts, authorization, persistence, transport, UI, and deployment.

Final architecture: 159 eligible concrete REST route modules export a shared Zod-backed applicationOperation and their default H3 entrypoint delegates only through defineStructuredOperationApiHandler(applicationOperation). The operation executor owns existing exact guards, domain functions, persistence, side effects, audit, serialization, and expected API errors; MCP invokes executeApplicationOperation on the same object. Explicit exclusions cover token/account lifecycle, session/auth, public mutations, webhooks/integration controls, CSV imports, email controls, and raw binary routes. The stable 10-operation TASK-426.2 talk-proposal inventory is included. Published SDK mismatch: agents@0.20.0 declares @modelcontextprotocol/server@2.0.0-beta.5 and its wrapper rejected initialization with stable server 2.0.0. Per integration direction, runtime transport uses stable @modelcontextprotocol/server@2.0.0 createMcpHandler; agents@0.20.0 remains installed at the exact required version but has no compatible runtime role. Validation: bun run typecheck passed; bun run lint passed; bun run test:unit passed (118 files, 800 tests); bun run test:integration passed with escalation for local Wrangler listener/log access (27 files, 367 tests); focused registry/talk/exclusion/annotation tests passed (5 tests).

Cross-review reopened this task. Findings: generic params/query/body input plus z.unknown output do not satisfy operation-specific contracts; HTTP-method-derived annotations misclassify destructive/idempotent behavior; URL-text capability inference disagrees with actual guards; opt-in-marker completeness counted 159 extracted modules while the eligible manifest/catalog has 149. Canonical tech-stack also contradicts the stable @modelcontextprotocol/server runtime and docs index contains a duplicate MCP entry. Official OpenAI tool guidance requires explicit input/output schemas, actual-behavior annotations, authorization, side effects, and complete use-case coverage.

Remediation completed 2026-08-13. The corrected explicit manifest inventories 184 concrete API routes: exactly 149 included operations and 35 exclusions with named reasons; this supersedes the stale 159 count in the earlier note. All ten talk-proposal operations are included. Every included route now declares its actual params/query/body Zod schemas, a per-operation structured data/list output schema, explicit coarse capabilities matched to its real guard, and an explicit domain effect that derives safety annotations. The MCP adapter registers both schemas. Known capability corrections cover current platform documents/settings, published staff/judge rosters, event-organizer-only event creation, judge-vs-staff assignments, and admin credit/prize operations. Completeness no longer reads an opt-in marker: it compares the independent all-route manifest, explicit catalog, and registered bindings. Verification: focused operation tests passed (6 tests); bun run lint passed; bun run typecheck passed; bun run test:unit passed.

Reopened after final self-audit: operation output envelopes are unique, but nested data/list payloads are still generic z.json(). The review requires exact operation payload schemas, so this task is active until every operation declares/registers a precise nested Zod output and completeness/representative tests prove it.

Final precise-output remediation: replaced generic nested JSON output payloads with a deterministic checked-in Zod schema for every operation, generated from the TypeScript-inferred serialized return of each shared executor. The 149-key generated schema map is registered by the REST/MCP operation factory; the unit suite proves exact key equality, representative nested account/talk fields, absence of z.any/z.unknown/z.json, data/list envelope consistency, and byte-for-byte generator freshness. Full integration validation exposed and fixed two previously hidden contract defects: event detail now declares an explicit public/admin output union including admin-only fields and narrowed term references, and event photo serialization now projects uploadedBy to exactly id/displayName instead of leaking the remaining user row. Verification: generator check passed; registry 6/6; protocol/token 11/11; lint passed; typecheck passed; unit 121 files/824 tests passed; escalated integration 28 files/379 tests passed.

Final re-review findings: generated output schemas contain 37 unconstrained nested objects from broad ApiListMeta/audit metadata typing, and eligibility generation derives include decisions from generated-catalog.ts. Remediation must make serialized schemas recursively constrained and make an independently maintained include/exclude manifest authoritative over catalog generation.

Final remediation completed: all 149 generated output contracts are recursively constrained; generic list metadata now infers each route's exact fields, and the two audit APIs use a finite nested JSON metadata type documented as the sole intentionally dynamic output. The generator rejects any/unknown, unconstrained array items, boolean-true schemas, and open additionalProperties. The independently maintained 184-route manifest is typed against 11 reviewed exclusion reasons and now generates the 149-route loader catalog. Mutation coverage proves removing an eligible loader fails catalog/manifest equality. Verification: catalog and output generator checks passed; constrained-node count is zero; focused registry 6/6, lint, typecheck, unit 121 files/824 tests, and git diff --check passed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Made MCP completeness independently authoritative and all 149 output contracts recursively exact. The manifest now drives the generated catalog with mutation coverage, while schema generation rejects unconstrained nested values; focused registry, lint, typecheck, 824 unit tests, generator freshness, and diff checks pass.
<!-- SECTION:FINAL_SUMMARY:END -->
