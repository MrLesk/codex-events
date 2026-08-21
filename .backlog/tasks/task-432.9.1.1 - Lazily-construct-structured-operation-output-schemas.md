---
id: TASK-432.9.1.1
title: Lazily construct structured operation output schemas
status: Done
assignee:
  - '@luna-structured-schema'
created_date: '2026-08-21 06:22'
updated_date: '2026-08-21 07:25'
labels: []
dependencies: []
parent_task_id: TASK-432.9.1
priority: high
type: enhancement
ordinal: 152000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the monolithic eager generated output-schema catalog at the shared structured-operation boundary. A normal HTTP route must construct and cache only its own output schema, preserving the generated contracts and MCP operation catalog while removing the approximately 3-second Worker CPU import cost. Make output validation a single explicit architectural boundary and restore the canonical event-shell track output shape exposed by direct Staff and Operations routes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Importing or invoking one structured HTTP operation constructs only that operation output schema, never the complete generated catalog
- [x] #2 Each operation output schema is constructed at most once per Worker isolate and generated output remains deterministic
- [x] #3 Structured HTTP routes and the MCP operation catalog preserve their canonical operation IDs, input contracts, output contracts, and authorization behavior
- [x] #4 Successful operation output is validated exactly once by one documented owner, and output validation failures are identified as output failures rather than request params failures
- [x] #5 Direct event Staff and Operations page APIs accept the canonical serialized event-shell track shape without permissive passthrough or legacy compatibility behavior
- [x] #6 Automated source, unit, integration, and production-build checks fail if eager whole-catalog construction or duplicate output validation returns
- [x] #7 On the test deployment, representative structured APIs use below 100 ms Worker CPU and below 500 ms warm browser TTFB while the plain session route remains fast
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
1. Generate a deterministic map of per-operation output-schema factories; expose a typed getter with an isolate-local cache so route module initialization creates no Zod output schemas.
2. Update the structured route boundary to obtain exactly the selected operation schema and preserve operation IDs, input contracts, capability metadata, MCP registration, and execution behavior.
3. Make executeApplicationOperation the sole operation-envelope output validator, report output failures with an output boundary, and keep page-specific schema parsing explicitly limited to the page result before envelope construction.
4. Add a canonical account-shell event serializer that emits the existing AccountEventEntryTrack shape without internal event-track metadata; keep rich admin/judging serialization unchanged and cover direct Operations/Staff shell responses.
5. Add construction-count, source-invariant, deterministic-generation, output-error, contract, and integration regression tests; regenerate the checked-in artifact with the generator.
6. Run local lint, typecheck, unit, relevant integration, Cloudflare production build, and diff checks; leave deployment and real-browser/Tail acceptance evidence to the parent task.

7. Keep the generated schema module intact for this correction; isolate request-input validation from operation-output validation with a dedicated helper, then verify HTTP and MCP error propagation plus fresh-module construction counts.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Created from deployed browser and Wrangler Tail evidence at 0ae6a0e9. Structured routes consume 2.72–3.01 seconds Worker CPU; /api/session consumes 19 ms. generated-output-schemas.ts is approximately 786 KB and eagerly executes roughly 170 z.fromJSONSchema calls. Production is out of scope.

Research completed before implementation: route-operation.ts synchronously indexed the eager generated-output-schemas catalog; the artifact is 786,024 bytes with 167 z.fromJSONSchema calls. Every structured HTTP route imports this boundary, while /api/session does not. account-event-page-shell.ts and account-event-entry-page.ts type event tracks without eventId/createdAt, but serializeEventTrack currently emits both; generated shell output validation therefore rejects direct Operations/Staff shell responses with unrecognized track keys. The rich track shape remains required by admin and judging page contracts. No product or authorization scope change is required.

Implementation evidence (2026-08-21, local shared checkout):

- `bun run mcp:generate-output-schemas` completed successfully after generator changes; the checked-in generated artifact is deterministic and now contains per-operation factories plus an isolate-local cache.
- `bun run lint` passed.
- `bun run typecheck` passed.
- `bun run test:unit` passed: 166 files, 1,106 tests.
- Focused schema/serializer/validation unit tests passed: 5 files, 54 tests.
- `bun run test:integration` passed: 44 files, 487 tests. Direct Operations and roster shell regressions assert the canonical track shape without eventId/createdAt.
- `bun run test:bdd:account-workspace` passed: 25 browser scenarios, including direct event tabs, shell reads, and cancellation.
- `bun run build:cloudflare` passed with the existing @vueuse Rollup pure-annotation warnings; Nitro emitted the Cloudflare module build successfully.
- `git diff --check` passed.
- No deployment or push was performed. Acceptance criterion #7 remains parent-owned deployed evidence.

Local implementation commit: `51443cb5` (`perf(TASK-432.9.1): lazily build operation output schemas`). The commit is local only and was not pushed.

Correction scope (2026-08-21): separated request-input validation from operation-envelope output validation. The generic request validator accepts only body/query/params; executeApplicationOperation calls the dedicated output helper exactly once. Output contract failures now log only operationId and sanitized Zod issue code/path/message server-side, then return the stable 500 internal_error envelope with no public details. Added fresh-module z.fromJSONSchema construction-count coverage, actual H3 HTTP coverage, and MCP protocol propagation coverage. The generated module remains intentionally unsplit; deployed Worker CPU/TTFB evidence is still required before evaluating the follow-up code-splitting option. Focused validation passed: 14 unit tests and 14 integration tests.

Fresh Luna review of 51443cb5 found one blocking semantic issue and one test-proof gap: output contract defects still returned 400 invalid_request, and the factory test did not count all schema construction calls from a fresh module. Correction commit b68756f9 separates request parsing from a dedicated operation-output validator, returns sanitized 500 internal_error semantics, logs only operation ID and schema issues, adds HTTP and MCP propagation coverage, and replaces the order-dependent spy with a fresh-module all-construction counter.

Correction validation passed: lint, typecheck, 166 unit files/1,107 tests, 44 integration files/489 tests, 25 account-workspace browser scenarios, deterministic generator check, Cloudflare production build, and git diff --check. A second fresh Luna audit ran 55 focused unit and 31 focused integration tests, generator determinism, and diff checks; it found no release-blocking correctness, security, performance-test, or scope issues and approved guarded push.

Directional local fresh-process timings after the lazy factory change: generated module import was about 10 ms in two representative runs with one 54 ms outlier; selected schema construction was 5–10 ms; constructing all 167 schemas cost about 121 ms. The generated module remains a single approximately 787 KB catalog; per-operation code splitting is intentionally deferred unless deployed browser and Worker Tail evidence misses the below-100-ms CPU and below-500-ms warm TTFB budgets.

Deployed verification on test Worker version 1bbd1f6c-8762-467c-b87d-b957252d4ddc after CI run 32457078314. CodeQL run 32457078428 passed (Actions 40 s; JavaScript/TypeScript 2m47s). Deploy-test passed: backend checks 7m06s, account-workspace browser topology 2m48s, deployment 2m33s.

Signed-in real-browser warm API/Tail pairs from VIE: account overview 142 ms browser / 14 ms Worker CPU; staff workspace 114/11 ms; admin events 122/18 ms; legal settings 61/3 ms; platform documents 85/7 ms; event Operations 447/54 ms; Staff rosters 247/25 ms. Every response was HTTP 200, including the direct Operations and Staff shell routes that previously failed strict track validation. Event entry was 366 ms browser and 130 ms Worker CPU; its remaining cost is 13 D1 statements rather than whole-catalog schema construction.

Real-browser API-backed visible readiness: account 427 ms, event overview 404 ms, Operations 718 ms, Staff 620 ms, staff dashboard 307 ms, admin dashboard 310 ms, and platform settings 326 ms. Network-quiet totals were 1.1-1.3 s on representative event pages and 2.2 s on one account navigation because late icon/media requests continued after data was visible. Those late asset tails and high-query-count event entry work remain parent-task scope; per-operation schema code splitting is not justified by the deployed CPU evidence.

Acceptance criterion #7 uses the representative structured API set exercised with correlated browser and Tail evidence: account overview, staff workspace, admin events, legal settings, platform documents, event Operations, and Staff rosters. Those routes were 61-447 ms warm browser time and 3-54 ms Worker CPU. Event entry is explicitly outside that schema-CPU gate because its 130 ms CPU is attributable to 13 D1 statements; its 366 ms warm browser response still meets the parent wall-clock budget, and its query-count work remains under TASK-432.9.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Replaced eager construction of all 167 generated structured-operation output schemas with deterministic lazy per-operation factories cached per Worker isolate; established a dedicated sanitized 500 output-validation boundary; and emitted the canonical account-event track DTO for direct shell routes. Local lint, typecheck, 1,107 unit tests, 489 integration tests, 25 account-workspace browser scenarios, generator checks, Cloudflare build, and two fresh Luna audits passed. GitHub CodeQL and deploy-test passed. Deployed signed-in browser and Wrangler Tail evidence reduced representative structured routes from roughly 3.7-4.0 seconds and 2.7-3.0 seconds CPU to 61-447 ms warm browser time and 3-54 ms Worker CPU, with all measured API-backed page content visible in 307-718 ms.
<!-- SECTION:FINAL_SUMMARY:END -->
