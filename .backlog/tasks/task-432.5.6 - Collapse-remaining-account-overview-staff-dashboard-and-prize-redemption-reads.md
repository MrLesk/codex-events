---
id: TASK-432.5.6
title: >-
  Collapse remaining account overview, staff dashboard, and prize-redemption
  reads
status: To Do
assignee:
  - '@luna-workspace'
created_date: '2026-08-19 19:54'
labels:
  - architecture
  - performance
dependencies:
  - TASK-432.5.1
parent_task_id: TASK-432.5
type: enhancement
ordinal: 140000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Purpose
Cover the remaining authenticated workspace surfaces discovered outside /account/events/:slug so the architecture does not leave the same fan-out pattern in account overview, staff dashboard, or prize redemption. This is still inventory-driven page shaping, not a generic graph API.

Owned client files
- app/pages/account/index.vue
- app/pages/account/staff.vue
- app/pages/prize-redemptions/index.vue
- app/composables/useEventParticipationWorkspace.ts
- app/composables/useUserEvents.ts
- app/composables/usePrizeRedemptionWorkspace.ts
- app/domains/events/participation.ts
- app/domains/events/staff-dashboard.ts
- app/domains/prize-redemptions/index.ts
- shared/domains/account/account-overview-page.ts (new concrete contract)
- shared/domains/account/account-staff-page.ts (new concrete contract)
- shared/domains/prize-redemptions/account-prize-redemptions-page.ts (new concrete contract)
Do not edit account-event tab components, the foundation files, or settings/operations/people implementation files.

Owned new server route/domain files
- server/api/account/overview.get.ts
- server/api/account/staff-workspace.get.ts
- server/api/prize-redemptions/workspace.get.ts
- server/domains/accounts/account-overview-page.ts
- server/domains/accounts/account-staff-page.ts
- server/domains/prize-redemptions/account-workspace-page.ts
Existing read/mutation routes are read-only dependencies:
- server/api/events/participation.get.ts
- server/api/account/events.get.ts
- server/api/prize-redemptions/me.get.ts
- server/api/events/[eventId]/terms/current.get.ts
- server/api/prize-redemptions/[redemptionId]/actions/redeem.post.ts
The new server assemblers compose domain functions directly and do not call those HTTP endpoints over the network. Do not alter public event or media routes.

Current fan-out and target
- Account overview currently uses the broad participation read. Convert it to one concrete GET /api/account/overview returning apiData<AccountOverviewPage> with current/past participation and the summary fields needed for first render. It remains one critical read after bootstrap and does not refresh the bootstrap for query-only changes.
- The staff dashboard uses /api/account/events through useUserEvents. Convert it to one GET /api/account/staff-workspace returning apiData<AccountStaffPage> with bounded current/past staff-visible event summaries and role/visibility fields needed for the page. Do not re-fetch session or scan the account event list per card.
- Prize redemption currently reads /api/prize-redemptions/me and then fetches current terms once per visible redemption with Promise.all. Convert it to one GET /api/prize-redemptions/workspace returning apiData<AccountPrizeRedemptionsPage> with redemption records and the authorized current terms needed for first render. The redemption action remains separate and refreshes only this contract.
- Each response is a named, bounded typed model. Do not add a resource graph, arbitrary includes, or client-controlled permission fields.

Authorization, D1, and cancellation
- Each handler resolves the request actor once, enforces current consent and the relevant account/event visibility once, and executes all reads through one strong request-scoped D1 database/session.
- Redemption term visibility and staff event visibility are server-side. The browser's bootstrap capabilities are hints for rendering only and never replace route authorization.
- Use the foundation signal-aware request helper and protected authorization generation. Navigation away, redemption refresh, or actor-generation changes abort/clear old work; stale/aborted data cannot commit.
- Keep redemption mutation semantics and idempotency unchanged; do not add inline external synchronization, Auth0 work, raw D1, standalone Drizzle, replica reads, or server-side HTTP calls.

Dependencies
TASK-432.5.1. This task can run in parallel with entry, operations, settings, and event-people tasks after the foundation contract is available.

Validation
- Unit: participation/staff/redemption response mapping, terms grouping, and authorization-generation scoping.
- Integration: account visibility/consent, event staff membership, hidden-event filtering, redemption term visibility, and one actor/authorization/session assertion.
- Local browser/Bdd: account overview, staff dashboard, and prize-redemption workspace each show one bootstrap plus one critical read; redemption action refreshes only its workspace; no per-redemption terms fan-out; navigation cancellation is stale-safe.
- Required eventual checks: bun run lint, bun run typecheck, bun run test:unit, bun run test:integration, bun run test:bdd. No remote/test/prod calls.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Account overview, staff dashboard, and prize-redemption workspaces each have one concrete first-render read after bootstrap.
- [ ] #2 Prize-redemption terms are composed into the workspace response and the per-redemption Promise.all fan-out is removed.
- [ ] #3 Each handler resolves actor/authorization once and uses one strong request-scoped D1 session with server-enforced visibility and consent.
- [ ] #4 Redemption actions remain separate and refresh only the redemption workspace; stale navigation responses cannot commit.
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
