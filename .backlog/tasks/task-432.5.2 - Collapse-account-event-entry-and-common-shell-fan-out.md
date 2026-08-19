---
id: TASK-432.5.2
title: Collapse account-event entry and common-shell fan-out
status: In Progress
assignee:
  - '@luna-workspace'
created_date: '2026-08-19 19:52'
updated_date: '2026-08-19 21:24'
labels:
  - architecture
  - performance
dependencies:
  - TASK-432.5.1
parent_task_id: TASK-432.5
type: enhancement
ordinal: 136000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Purpose
Replace the account event page's bootstrap-time Promise.all and conditional reads with an event-scoped entry contract, and move the outcomes/prizes tab to one page-shaped read. The entry page remains a thin template/composition surface; panels receive typed data and emit mutations.

Owned client files
- app/pages/account/events/[slug]/index.vue
- app/components/account/events/AccountEventCreditsPanel.vue
- app/components/account/events/AccountEventSimplifiedClaimingControl.vue
- app/components/account/events/AccountEventSimplifiedClaimingPanel.vue
- app/components/account/events/AccountEventSimplifiedClaimingStep.vue
- app/components/account/events/AccountEventTalkProposalPanel.vue
- app/components/account/events/AccountEventTalkProposalReviewPanel.vue
- app/components/account/events/AccountEventParticipationRankNotice.vue
- shared/domains/events/account-event-entry-page.ts (new concrete entry contract)
- shared/domains/events/account-event-prizes-page.ts (new concrete prizes/outcomes contract)
Do not edit app/domains/events/account-workspace-tabs.ts, app/domains/events/account-workspace-page.ts, app/composables/useAccountEventPageRequest.ts, or app/composables/useAdminWorkspace.ts; consume the foundation.

Owned server route/domain files
- server/api/account/events/[slug]/entry.get.ts (new)
- server/api/account/events/[slug]/prizes.get.ts (new)
- server/domains/events/account-event-entry-page.ts (new)
- server/domains/events/account-event-prizes-page.ts (new)
The following are existing source endpoints and read-only dependencies for the new server assemblers; do not call them over HTTP from the Worker and do not widen their payloads:
- server/api/events/slug/[slug]/index.get.ts
- server/api/account/events.get.ts
- server/api/events/participation.get.ts
- server/api/events/[eventId]/prizes/index.get.ts
- server/api/events/[eventId]/talk-proposals/me.get.ts
- server/api/events/[eventId]/talk-proposals/index.get.ts
- server/api/events/[eventId]/credits/index.get.ts
- server/api/events/[eventId]/winners/index.get.ts
- server/api/events/[eventId]/published-projects/index.get.ts
- server/api/events/[eventId]/rank/me.get.ts
Route IDs/capabilities/effects are supplied to the TASK-432.5.1 foundation owner for manifest/catalog regeneration; do not hand-edit generated registry files here.

Current fan-out to eliminate
- app/pages/account/events/[slug]/index.vue currently reads /api/events/slug/:slug and then fans out to /api/events/:eventId/prizes, /api/account/events, /api/events/participation, optional /talk-proposals/me, and conditional /credits; tab activation can add staff/judge rosters, winners, published projects, and rank reads.
- AccountEventTalkProposalPanel also mounts its own /talk-proposals/me read.
- The page derives the event access and participation record by scanning broad account-wide lists.

Target topology and typed shapes
- After the single shared account bootstrap, entry navigation makes exactly one GET /api/account/events/:slug/entry. Its typed data includes event identity/state/restricted workspace fields, the event-scoped account access record (not the whole account event list), event-scoped participation (not the whole participation list), the participant's credits when applicable, the caller's talk proposal plus authorized review summaries when applicable, and server-computed tab visibility. One server authorization resolution and one request-scoped strong D1 session serve the whole response.
- The entry endpoint owns the current event/prizes/account-events/participation/talk-proposals/credits fan-out boundary. Do not issue a separate client request for any of those resources from the entry page or common panels. The client must not send capabilities or derive permission as authority.
- Remove unconditional prize prefetch from entry navigation. When the prizes tab is selected, make exactly one GET /api/account/events/:slug/prizes. Its concrete response includes the event state needed by the tab, prize definitions, winners, published projects, and participant rank/outcome when visible. It replaces the current prizes + winners + published-projects + rank fan-out and is lazy on tab activation.
- Both routes return apiData<T> with concrete shared types; there is no arbitrary resource map or include parameter. A missing/not-applicable feature is represented by the contract's explicit null/empty value after server authorization, not by another request.
- Mutations for talk proposals, credits, tracks, certificate visibility, Luma verification, and withdrawal remain separate action routes. On success, refresh the active page contract once or merge the typed mutation result; do not refresh account bootstrap or fan out the old reads.

Authorization, D1, and cancellation
- The entry/prizes handler resolves the request actor once, uses the shared account-event page context to resolve authorization once, and uses one strong request-scoped database/session for all composed domain reads.
- No raw D1 binding, standalone Drizzle client, H3 test injection, replica consistency, external HTTP call, identity reconciliation, or server-side call to another API route.
- Page requests use the foundation composable and AbortSignal. Entry/prizes navigation aborts the previous request on slug/tab change and disposal; stale or aborted responses must not commit into the active panel, Nuxt data cache, or error state.
- Keep the public event detail/media contract unchanged; this task does not touch managed media/cache behavior.

Component boundary
- The page owns route state, tab selection, the entry/prizes requests, and mutation orchestration.
- Credits and talk panels become typed-prop/event consumers. The talk panel must not issue its own onMounted read after the entry response already contains the proposal. The admin review panel consumes the authorized review slice from the entry response.
- Preserve existing App/domain component ownership and lazy panel boundaries; do not create a second local card/form/row system.

Dependencies
TASK-432.5.1. This task can run in parallel with operations, settings, people, and remaining-workspace tasks after the shared foundation contract is available.

Validation
- Unit: concrete entry/prizes response types and page/tab mapping; existing talk/credits/prize domain behavior remains covered.
- Integration: entry/prizes route permission/state matrix, hidden event behavior, one actor/authorization/session assertion, and no unauthorized proposal/credit leakage.
- Local browser/Bdd: authenticated entry has one bootstrap and one entry read; switching to prizes has one prizes read; talk/credits panels render without feature-local reads; aborting a rapid tab change cannot paint stale data.
- Required eventual checks: bun run lint, bun run typecheck, bun run test:unit, bun run test:integration, and targeted authenticated BDD scenarios. No remote/test/prod calls.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The account event entry performs one shared bootstrap plus one entry page read and no longer performs separate event, account-events, participation, talk-proposal, or credits reads.
- [ ] #2 The prizes tab performs one page-shaped read containing its first-render prizes/outcomes data and does not fan out to prizes, winners, published projects, or rank endpoints.
- [ ] #3 Credits and talk panels are typed prop/event consumers with no feature-local bootstrap or duplicate onMounted read.
- [ ] #4 Entry and prizes routes enforce event visibility and authorization server-side through one actor, one authorization resolution, and one strong request-scoped D1 session.
- [ ] #5 Rapid slug/tab changes cancel prior requests and stale responses never update the active workspace.
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
1. Trace the committed foundation contracts and current entry/prizes fan-out within the owned route/page/panel scope.
2. Implement concrete shared entry and prizes contracts plus request-scoped server assemblers using the foundation context, without touching generated registries or other child files.
3. Convert the account-event page and owned common panels to one entry read and lazy one prizes read with typed props/events, abort propagation, authorization-generation scoping, and no feature-local reads.
4. Add focused contract, permission/session-topology, request-count, and cancellation tests within the owned scope.
5. Run scoped and required local validation, inspect only owned changes, record integrator metadata, and commit locally without push or deployment.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Started TASK-432.5.2 in the shared worktree. This task owns only the entry/prizes routes, entry/prizes shared/server contracts, account-event entry page, and listed common panels/tests. Foundation files, generated registries, media/D1 internals, and sibling task files remain excluded. Local-only validation and commit are required; no remote D1, deployment, or push.

Implemented local entry/prizes page contracts and removed the account-event entry/prizes fan-out from the owned page, credits panel, and talk panels. Entry navigation is one shared bootstrap plus GET /api/account/events/:slug/entry; prizes is one lazy GET /api/account/events/:slug/prizes. Integrator metadata for TASK-432.5.1: id=get.account.events.by-slug.entry, toolName=get_account_events_by_slug_entry, description=GET /api/account/events/:slug/entry, rest={method:'GET',path:'/api/account/events/:slug/entry'}, input={params:routeSlugParamsSchema}, output=data, capabilities=[platform_user], effect=read; id=get.account.events.by-slug.prizes, toolName=get_account_events_by_slug_prizes, description=GET /api/account/events/:slug/prizes, rest={method:'GET',path:'/api/account/events/:slug/prizes'}, input={params:routeSlugParamsSchema}, output=data, capabilities=[platform_user], effect=read. Validation: owned eslint passed; git diff --check passed; focused unit contracts passed 2 files/6 tests. Full typecheck is blocked by concurrent server/database/non-http.ts TS7022 and AppDatabase.get errors in server/domains/mcp/tokens.ts and server/domains/talk-proposals/index.ts. Full unit is 985 passed/8 failed; full integration is 90 passed/328 failed; focused integration is 4 failed before route resolution at auth-identities.ts because the concurrent local AppDatabase facade has no terminal .get(). BDD is 7 passed/56 failed, with authenticated session/app initialization blocked by the same local actor/database transition. No remote D1, deploy, or push used.
<!-- SECTION:NOTES:END -->
