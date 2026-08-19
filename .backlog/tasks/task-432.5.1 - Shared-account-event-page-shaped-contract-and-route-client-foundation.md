---
id: TASK-432.5.1
title: Shared account-event page-shaped contract and route/client foundation
status: In Progress
assignee:
  - '@luna-workspace'
created_date: '2026-08-19 19:51'
updated_date: '2026-08-19 20:45'
labels:
  - architecture
  - performance
dependencies:
  - TASK-432.2
  - TASK-432.3
  - TASK-432.4
parent_task_id: TASK-432.5
type: enhancement
ordinal: 135000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Purpose
Create the reusable boundary that every account-event page task consumes. This is a contract/request-topology task, not a generic graph API and not a D1/bootstrap/media correction.

Owned write scope
Client:
- app/domains/events/account-workspace-tabs.ts
- app/domains/events/account-workspace-page.ts (new shared page envelope/base types)
- app/composables/useAccountEventPageRequest.ts (new signal-aware page request composable)
- app/composables/useAdminWorkspace.ts (the existing shared file is owned here; remove its cross-tab fetch orchestration or reduce it to the shared page/request boundary so settings and operations workers do not edit it)
- tests/unit/app/domains/events/account-workspace-tabs.test.ts only when the tab contract changes

Server:
- server/domains/events/account-event-page-context.ts (new request-scoped event/actor/authorization/database context)
- server/domains/events/account-event-page-contract.ts (new shared server/client-facing contract helpers/types if the shared types cannot live under shared/domains)
- all new account-event page routes must use this boundary; the foundation owns the route-operation registration policy and final regeneration of:
  - server/application/operations/eligibility-manifest.ts
  - server/application/operations/generated-catalog.ts
  - server/application/operations/generated-output-schemas.ts
  Route workers must not hand-edit these shared registry/generated files; they provide their concrete route IDs, paths, capabilities, effects, and output types to this task.
- docs/api-surface.md for the concrete page-route convention and operation inventory. Do not update media, D1, bootstrap, or unrelated API sections.

Contract and topology
- Establish concrete REST paths under /api/account/events/:slug/<page>, with one named route per page contract: entry, prizes, operations, submissions, judging, settings, participants, workspace, teams, rosters, gallery, feedback, and certificates. Remaining account workspaces use similarly named non-graph routes under /api/account or /api/prize-redemptions.
- Every route returns the normal typed apiData<T> envelope with one concrete T. Define AccountEventPageResponse<T> only as a small common envelope (event identity/state plus server-computed event-scoped visibility); each child owns its concrete page data type in a disjoint shared/domain file. Do not put arbitrary resource maps, client-selected include arrays, or a generic graph/query language in the contract.
- The common page request composable consumes the existing useSessionActor, useApiData/useApiFetch, useApiClient, useAuthorizationCache, and useAbortableRequest from TASK-432.2. It must not load /api/session, refresh actor data for query-only tab changes, create another client, or bypass the protected authorization generation.
- Route handlers resolve the request actor once, resolve event authorization once, obtain one request-scoped strong D1 database/session, and pass that context through domain reads. They must not call existing HTTP endpoints from the server, resolve raw D1, create a second Drizzle client/session, use replica consistency, or trust client capabilities.
- Keep mutation routes separate. A mutation may invalidate/refresh the current page contract, but the page render itself is one read.

Cancellation and stale-state rules
- Tab/page changes and component disposal abort the prior request through the shared signal contract; dedupe is cancel.
- Pass the signal through pagination/fan-out helpers where the concrete page read needs bounded internal work. An aborted request must not update active view state, caches, or loading/error state for the new tab.
- Authorization-generation changes clear protected page state; public data and bootstrap remain outside that generation.

Unavoidable shared ownership
- useAdminWorkspace.ts is a real shared client file used by current settings and operations fan-out and therefore cannot be split between those children.
- the MCP eligibility manifest and generated operation/output catalogs are generated/shared integration surfaces. The foundation lead owns the final registry regeneration after all child route files exist. Child workers must leave exact route metadata in their task notes and must not make unrelated changes to those files.
- app/components/account/events/AccountEventAdminSettingsPanel.vue, AccountEventAdminOperationsPanel.vue, and all other feature panels belong to their child tasks, not this foundation task.

Explicit exclusions
- Do not modify the shared account bootstrap/client/cancellation implementation owned by TASK-432.2.
- Do not modify D1/session/bookmark architecture owned by TASK-432.4; consume its accessors only.
- Do not modify managed public media/cache behavior owned by TASK-432.6.
- Do not add a compatibility/dual-read path or a feature-local /api/session call.

Dependencies
TASK-432.2, TASK-432.3, TASK-432.4.

Validation
- Unit tests for the shared route/tab/request contract and authorization-generation scoping.
- Targeted server contract tests proving one actor/authorization/database-session path per page handler.
- bun run lint; bun run typecheck; bun run test:unit; run bun run test:integration when the new server context is exercised.
- Run bun run mcp:generate-operation-catalog and bun run mcp:generate-output-schemas only after all child route definitions are present, then verify the generated files and operation inventory.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A shared typed account-event page envelope and request composable exist, with one concrete contract per page and no generic graph/include API.
- [ ] #2 Every child page route can resolve actor and authorization once and use one request-scoped strong D1 database/session without raw binding access or internal HTTP fan-out.
- [x] #3 Protected page requests use the existing bootstrap authorization generation and shared signal-aware cancellation; aborted or stale responses never commit.
- [ ] #4 The shared admin workspace fetch file, route registry integration, and API-surface documentation have one explicit owner and no child write-scope ambiguity.
- [x] #5 No changes are made to TASK-432.2 bootstrap/cancellation, TASK-432.4 D1/session, or TASK-432.6 media behavior.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [ ] #3 Relevant validation commands pass
- [x] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Trace the existing account-event tab keys, shared authorization-generation and cancellation composables, server authorization/database accessors, and operation catalog conventions.
2. Define the named account-event page contract registry and server request context without touching child payload implementations or D1/media internals.
3. Implement the standalone signal-aware account-event page request with generation-scoped keys and stale-response protection; keep useAdminWorkspace only as the distinct root-admin index boundary and remove its event-tab fan-out.
4. Add source/contract tests for one actor/authorization/database path, no raw binding/session construction, named route/schema registration, cancellation behavior, and the explicit child migration boundary; update the API-surface docs.
5. Run lint, typecheck, unit, integration, and focused BDD as applicable; inspect the diff and commit only TASK-432.5.1-owned files.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Started shared-foundation implementation from the committed TASK-432.5 parent. Existing unrelated TASK-432.4/.6 changes remain outside scope and must not be staged.

Design correction recorded: useAdminWorkspace remains the distinct root-admin index boundary used by account/admin.vue and the admin event-creation pages. It no longer owns event settings or operations fan-out. The old useAdminEventSettingsWorkspace and useAdminEventOperationsWorkspace exports are intentionally absent; TASK-432.5.4 and TASK-432.5.3 must migrate AccountEventAdminSettingsPanel.vue and AccountEventAdminOperationsPanel.vue to the typed page request foundation.

Compile boundary validation: bun run typecheck reaches only the unmigrated child settings/operations panels (missing useAdminEventSettingsWorkspace/useAdminEventOperationsWorkspace at line 84, followed by implicit-any/property errors from the absent payload types) plus unrelated existing server/domains/talk-proposals/email-queue.ts errors at lines 447 and 467. Root-admin consumers compile against the preserved boundary. No child panels were edited.

The page context now performs one slug event read, local canonical workspace visibility/access checks using the resolved actor/database/event, and one cached event-authorization resolution. The route executor requires a named page, concrete child Zod schema, validates slug/page params, and parses the child output.

Docs correction: restored docs/api-surface.md managed-media/D1/bootstrap wording to the HEAD baseline; only the account-event page-route convention and foundation ownership were added. Generated operation catalogs remain deferred until child route definitions exist.

Final typecheck rerun after the root-admin boundary and signal-link correction reports only the two intentionally unmigrated child panels: AccountEventAdminOperationsPanel.vue:84 and AccountEventAdminSettingsPanel.vue:84 for removed legacy workspace composables, with their expected payload-driven cascade errors. No root-admin page, page foundation, context, contract, or test file errors were reported. Earlier full validation also exposed unrelated talk-proposal/queue changes in the shared worktree; those are not part of this task and were not staged.

Final validation status: scoped ESLint and all seven foundation test files pass (46 tests). Full lint now reports only unrelated dirty-worktree errors in server/domains/events/index.ts:2279-2293 and tests/integration/server/api/event-routes.test.ts:4731. Full test:unit reports unrelated talk-proposal/index, talk-proposal/email-queue, and HTTP database-boundary failures; full test:integration reports the corresponding unrelated event/application/talk-proposal/MCP failures. No focused BDD was run because this foundation adds no concrete child route or browser page; browser topology remains TASK-432.5.7 scope. Testing guidance is covered by the new api-surface route contract and task notes; docs/testing-strategy.md remains unstaged because its existing diff is TASK-432.6-owned media guidance.

Hardening follow-up: account-event page requests explicitly use server: false; client and server named registries are parity-tested; page context resolves EventAuthorization before its local visibility check and derives role access without a second event-role query; every child route definition must provide authorize(context), which executes once before load and may use only the pre-resolved context.

Hardening validation: focused Vitest 6 files/13 tests passed; scoped ESLint passed; bun run lint passed; bun run test:unit passed with 137 files/972 tests. bun run typecheck remains blocked only by the explicitly deferred AccountEventAdminOperationsPanel.vue:84 and AccountEventAdminSettingsPanel.vue:84 consumers and their cascaded missing-payload types; no foundation-file errors. No integration or BDD run because this follow-up adds no concrete route or browser surface. docs/api-surface.md and all unrelated .4/.6 worktree changes remain unstaged.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented the shared account-event page foundation: named page contracts and concrete route paths, a request-scoped actor/event-authorization/strong-D1 context with canonical workspace visibility checks, concrete Zod-validated child route definitions, and a signal-linked protected page request composable. The root-admin useAdminWorkspace remains only the manageable-event index boundary; event settings/operations callers are explicitly deferred to TASK-432.5.3/.5.4. Verified with 46 focused unit tests, scoped ESLint, staged diff checks, and the documented full-suite/typecheck results. Child routes and generated operation catalogs remain pending until their disjoint child tasks land.
<!-- SECTION:FINAL_SUMMARY:END -->
