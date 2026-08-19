---
id: TASK-432.5.1
title: Shared account-event page-shaped contract and route/client foundation
status: In Progress
assignee:
  - '@luna-workspace'
created_date: '2026-08-19 19:51'
updated_date: '2026-08-19 22:59'
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
1. Reconcile one client-safe account-event page registry and use it for client path/cache construction and server route validation without a server-to-client dependency.
2. Add typed selectedTeamSlug query normalization, encoding, cache-key scoping, server parsing, and same-request teams selection; prove one page read, cancellation, and query-only navigation.
3. Wire the account-event route composition surface to concrete operations, submissions, judging, assignment, settings, and existing page-shaped panel props while preserving props-down/events-up.
4. Add exact route/registry parity and actor/authorization/session/query-topology tests; record child operation metadata without editing generated catalogs or media files.
5. Run scoped lint, focused unit, typecheck, and broader checks as the shared D1/media worktree permits; inspect git diff HEAD and commit only owned integration paths.

6. Add the global non-event page executor and named route registry with one actor/database context and runtime output schemas.
7. Reconcile event judging assignment execution and concrete entry/prizes/operations/judging schemas without touching generated operation files.
8. Add authorization-order, output-rejection, actor/session-count, and route/registry parity tests; run scoped then full validation.
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

Component/data-flow map (integration):
- Account event route: [slug]/index.vue owns slug/tab/query state, page-request instances, mutation refresh routing, and composition only. entry response feeds event/access/participation/talk/credits derived state; prizes, teams, rosters, gallery, feedback, participants, certificates, operations, submissions, judging, and settings page responses flow as typed props into the active panel. Child panels remain presentational/stateful consumers and emit mutation/update events back to the route.
- Shared request boundary: useAccountEventPageRequest resolves the page name plus typed query, builds the canonical path/cache key, waits for the existing bootstrap, forwards one AbortSignal, and cancels stale tab/query requests without refreshing bootstrap on query-only navigation.
- Server boundary: executeAccountEventPageRoute parses the named route/query, resolves actor, authorization, and request-scoped database through account-event-page-context once, invokes the concrete route authorizer once, loads one concrete schema, and returns the typed apiData envelope. Teams receives selectedTeamSlug in the same page load.
- External team routes: teams/index.vue and teams/[teamId].vue pass the normalized route team slug as selectedTeamSlug to the shared request; AccountEventParticipantTeamPanel consumes page.selectedTeam and does not resolve the slug with a second request.
- Panel handoffs: operations/submissions receive their page payload and refresh callback; judging receives judging and optional assignment page payloads; settings receives the settings page payload; participant/team/roster/gallery/feedback/certificate panels continue their existing typed page props and mutation events.

Integration risks: keep client/server registry parity without importing server code into the client; do not touch generated operation output schemas or TASK-432.6 media files; preserve active TASK-432.4/TASK-432.6/TASK-433 worktree changes. Child operation metadata remains an unresolved generated-catalog handoff until the catalog is regenerated outside this owned scope.

Unresolved generated application-operation registry handoff (generated files intentionally untouched): add these five child-provided GET operations to the generated operation catalog and MCP eligibility manifest, each with output data and effect read.
- id get.account.events.by-slug.operations; tool get_account_events_by_slug_operations; path /api/account/events/:slug/operations; params slug; capability event_admin.
- id get.account.events.by-slug.submissions; tool get_account_events_by_slug_submissions; path /api/account/events/:slug/submissions; params slug; capability event_admin.
- id get.account.events.by-slug.judging; tool get_account_events_by_slug_judging; path /api/account/events/:slug/judging; params slug; capabilities event_judge and event_admin.
- id get.account.judging; tool get_account_judging; path /api/account/judging; no params; capability event_judge.
- id get.account.events.by-slug.judging.assignments.by-assignmentId; tool get_account_events_by_slug_judging_assignments_by_assignmentId; path /api/account/events/:slug/judging/assignments/:assignmentId; params slug and assignmentId; capability event_judge.
No duplicate compatibility adapters are to be added; reconcile the generated source later.

Server contract checkpoint: added the global account-page executor/context and registry for overview, judging inbox, staff workspace, and prize-redemption workspace; added concrete runtime schemas for global and owned event page payloads; registered all 13 event page definitions without editing generated operation catalogs. Added route/registry parity coverage and preserved the generated-catalog integrator handoff. Validation in this slice: bun run lint passed; bun run typecheck passed; focused Vitest passed (5 files, 13 tests); focused page integration passed (2 files, 8 tests). Full unit remains blocked by the intentionally stale generated-operation inventory and an unrelated useTeamFormationWorkspace timeout; full integration has pre-existing media/profile-revision and API-envelope assertion failures; BDD could not start because localhost:3100 is already in use. No remote D1, deploy, or push.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added the global named page executor/route registry and concrete runtime page contracts while preserving generated operation files for the foundation integrator. Verified lint, typecheck, focused contract/topology tests, and focused page integrations; broader pre-existing/generated handoff failures remain documented.
<!-- SECTION:FINAL_SUMMARY:END -->
