---
id: TASK-432.5.6
title: >-
  Collapse remaining account overview, staff dashboard, and prize-redemption
  reads
status: Done
assignee:
  - '@luna-workspace'
created_date: '2026-08-19 19:54'
updated_date: '2026-08-20 21:47'
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
- [x] #1 Account overview, staff dashboard, and prize-redemption workspaces each have one concrete first-render read after bootstrap.
- [x] #2 Prize-redemption terms are composed into the workspace response and the per-redemption Promise.all fan-out is removed.
- [x] #3 Each handler resolves actor/authorization once and uses one strong request-scoped D1 session with server-enforced visibility and consent.
- [x] #4 Redemption actions remain separate and refresh only the redemption workspace; stale navigation responses cannot commit.
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
1. Define the three concrete shared contracts and route paths under shared/domains/account and shared/domains/prize-redemptions; preserve the existing apiData envelope and protected-generation key boundary.
2. Add account overview, staff workspace, and prize-redemption workspace server assemblers/routes that resolve the platform actor once, use the request-scoped strong database, enforce hidden-event/staff/recipient/terms visibility server-side, and avoid HTTP fan-out.
3. Migrate the owned account, staff, and prize-redemption composables/pages to one signal-aware useApiData request each; remove client-side staff filtering and per-redemption terms Promise.all; keep redeem mutation separate and refresh only the workspace model.
4. Add focused shared-contract/domain/composable tests plus integration coverage for consent/visibility/terms grouping, one request session, and query topology; extend the existing local prize BDD topology check without touching other child surfaces.
5. Run scoped lint, typecheck, unit, integration, and required BDD checks; inspect only scoped changes, record generated operation metadata for TASK-432.5.1, and commit locally without push/deploy/remote D1.

6. Replace per-event getTeamCompetitionOutcome calls in account participation with one fixed-query bulk outcome plan scoped by the authenticated participant; preserve ranking/prize semantics and prove constant query count across many events.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Context brief: account overview currently consumes the existing participation read, staff dashboard consumes the broad account event list and filters roles in the browser, and prize redemption performs one pending-redemption read plus one current-terms request per visible event. The implementation keeps existing mutation routes and uses named page models.
Component map: each page remains a composition surface; useEventParticipationWorkspace, useUserEvents, and usePrizeRedemptionWorkspace own request state; shared/domain files own serializable page contracts; server/domain page files own server-side assembly; existing EventParticipationCard and AccountEventDashboardList remain presentational consumers.
Ownership boundary: do not edit TASK-432.5.1 foundation files, operation generated catalogs/manifest, D1/database internals, media, or another .5 child. Exact generated operation metadata will be recorded after route definitions exist for later foundation integration.

Implementation and validation update:
- Added named page contracts and signal-aware protected reads for account overview (/api/account/overview), staff dashboard (/api/account/staff-workspace), and prize redemptions (/api/prize-redemptions/workspace). The redemption action remains separate and refreshes only the workspace model.
- Request topology is now one shared /api/session bootstrap plus one page read for each first render. The previous prize path was one /api/prize-redemptions/me read plus one /api/events/{eventId}/terms/current read per visible event; it is now one workspace read with terms joined into the response.
- Canonical docs were reviewed and confirmed unchanged. Scoped diff checks and lint passed; focused unit tests passed (4 files, 32 tests). Full typecheck/lint/unit/integration and BDD runs were attempted locally. Full checks are currently blocked by concurrent shared-worktree changes: the new AppDatabase facade removed .get() while existing actor/MCP/talk-proposal paths still call it; other concurrent routes/components also have unresolved exports/types/generated-registry entries. Integration ended 35 files, 409 tests, 8 passed, 27 failed, including the four new workspace tests at the actor boundary. BDD on isolated local port 3101 ended 63 tests, 7 passed, 56 failed; the new account-overview browser scenario reached the same actor boundary, and the server also reported concurrent missing talk-proposal/judging exports. The stable browser personas do not include a staff-enabled assignment, so staff dashboard browser coverage remains an explicit fixture gap; server integration coverage is present but blocked before authorization. No remote database, deployment, or push was used.
- Generated operation metadata intentionally remains for the TASK-432.5.1 integrator: id=get.account.overview, toolName=get_account_overview, description=GET /api/account/overview, REST=GET /api/account/overview, input={}, output=data, capabilities=[platform_user], effect=read; id=get.account.staff-workspace, toolName=get_account_staff_workspace, description=GET /api/account/staff-workspace, REST=GET /api/account/staff-workspace, input={}, output=data, capabilities=[platform_user], effect=read; id=get.prize-redemptions.workspace, toolName=get_prize_redemptions_workspace, description=GET /api/prize-redemptions/workspace, REST=GET /api/prize-redemptions/workspace, input={}, output=data, capabilities=[platform_user], effect=read. Do not hand-edit generated catalogs; the integrator should register these routes and regenerate them.

Correction requested: account overview still performs per-event outcome reads. Scope is participation/outcomes helper/tests only; no remote database, deployment, or push.

Correction validation: focused participation/outcome integration test passes with one versus five completed events at a constant query count, correct ranks/prizes, one request session, and no SQL IN predicate; legacy participation integration test passes; outcomes unit tests pass; scoped ESLint and full lint pass; Cloudflare build passes. Full typecheck remains blocked by two unrelated dirty-worktree UI type errors. Full unit has one unrelated useTeamFormationWorkspace timeout (1008/1009 passed); full integration has three unrelated dirty-worktree failures (consent envelope, profile-icon revision expectation, and outcome profile-icon expectation). BDD could not start because localhost:3100 was already occupied. No remote database, deployment, or push.

Exact local candidate dfe6fb6d0c4f972b9a0040be71e6bcfe0501d483: MCP generators clean; bun run lint and bun run typecheck pass; unit 155 files/1047 tests; integration 40 files/455 tests; Cloudflare build pass; workflow topology 2/2; focused Chromium topology 22/22 with zero API, console, or page errors, usable timings about 171-655ms, Settings local editor with zero CDN requests, and one intentional cancellation abort; full BDD 85/85 and destructive BDD 2/2. No remote deployment, CI, test URL, CF-Cache-Status, or remote cache evidence exists. Independent review found no P0, P1, or P2; nonblocking P3: an invalid or denied entry-family tab query may remain in the URL after a 403/404 entry response, without a data leak. Account overview, staff workspace, and prize redemption have server/integration coverage for one page read and one actor/authorization/session path. The stable browser persona matrix does not include a staff-dashboard persona; docs/testing-strategy.md records that fixture gap while the final integration gate passed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Account overview, staff dashboard, and prize-redemption page reads are complete at dfe6fb6d. The workspace contracts join redemption terms, remove per-redemption fan-out, preserve separate redemption mutations, and use bounded protected reads. The final local gate passed; staff-dashboard browser coverage remains a documented stable-fixture gap and no remote deployment or CI evidence is claimed.
<!-- SECTION:FINAL_SUMMARY:END -->
