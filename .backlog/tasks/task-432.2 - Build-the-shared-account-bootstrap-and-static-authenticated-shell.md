---
id: TASK-432.2
title: Build the shared account bootstrap and static authenticated shell
status: In Progress
assignee:
  - '@luna-bootstrap'
created_date: '2026-08-19 06:22'
updated_date: '2026-08-19 19:25'
labels: []
dependencies:
  - TASK-432.1
references:
  - app/domains/accounts/navigation-guards.ts
  - app/composables/useSessionActor.ts
  - nuxt.config.ts
parent_task_id: TASK-432
priority: high
type: enhancement
ordinal: 129000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Serve account and admin routes as an immediate Nuxt client shell while preserving Auth0 server-side API security. Replace route-local session calls with one shared actor/bootstrap client and one source of truth for account navigation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Account, admin, and prize-redemption navigations do not block document rendering on D1-backed SSR data
- [x] #2 Route guards and account features consume one shared typed bootstrap state and do not issue duplicate session requests
- [x] #3 Auth0 session and all authorization decisions remain enforced by server APIs
- [x] #4 Query-only event-tab navigation does not refresh actor state
- [x] #5 Unit and local browser tests cover anonymous redirects, authenticated navigation, consent gating, and bootstrap deduplication
- [x] #6 Protected useAsyncData and client cache state use one reusable authorization-generation mechanism that invalidates protected data when actor identity, roles, capabilities, or consent changes within one Nuxt app instance.
- [x] #7 Protected read paths propagate AbortSignal through useAsyncData and imperative composables, with abandoned requests unable to update the active view.
- [x] #8 All authenticated fetches use the shared API client, including registration mutations and simplified redemption; transport tests cover payloads, headers, aborts, hooks/errors, and concurrent bookmark monotonicity.
- [x] #9 Shared session tests prove concurrent consumers issue one bootstrap request and invalidate protected cache state when authorization changes; public event tests prove signed-in and signed-out HTML/payload equivalence and query-only navigation does not re-bootstrap.
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
1. Make /account/**, /admin/**, and /prize-redemptions/** client/static shells with ssr:false, and prevent named auth middleware from performing server-side account bootstrap on those shell routes while preserving browser redirects and consent gating.
2. Refine the shared typed useSessionActor bootstrap into the single client-only, keyed account/session state with deduplicated loading, explicit readiness, and derived capabilities; make navigation guards consume it while preserving Auth0 login, platform-account, consent, and event-role decisions.
3. Refactor admin, judge, and participant composables to consume the shared bootstrap and remove feature-local /api/session fetches and refresh paths. Keep route pages as composition surfaces and feature composables responsible for their own domain reads and mutations.
4. Update unit coverage for bootstrap deduplication, redirects, consent gating, shared admin/judge/participant consumption, and query-only navigation without actor refresh; add or adjust local authenticated browser coverage for one bootstrap per workspace and tab navigation when the existing fixture supports it.
5. Run diff checks, lint, typecheck, unit tests, and relevant local-D1 browser validation; review the concurrent worktree, stage only TASK-432.2 implementation/tests plus its own Backlog file, make one focused local commit, and do not push or deploy.

6. Add bookmark continuity to the shared client transport: capture X-D1-Bookmark responses and attach the latest bookmark to subsequent calls, including mutation-then-read sequences. Route useApiData/useApiFetch and shared account workspace fetchers through it, with focused transport tests; do not add feature-local header handling.

7. Add one authorization-generation cache invalidation boundary shared by session/bootstrap and protected async data; propagate request signals through protected composables; migrate authenticated raw fetches to useApiClient; strengthen transport/session/public cache tests without implementing page-shaped event endpoints.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Component map before Vue edits:
- Route/page components remain composition surfaces and receive state from composables; no new page-owned bootstrap state or side effects.
- useSessionActor owns shared typed bootstrap state, loading, refresh, and derived capabilities.
- navigation-guards and named middleware own route decisions/redirect adaptation, not feature-local session requests.
- useAdminWorkspace, useJudgeWorkspace, and useParticipantApplication own feature data and consume the shared bootstrap; no local session adapters.

Bookmark integration: TASK-432.4 now emits and accepts x-d1-bookmark at the server transport boundary. TASK-432.2 will carry it only in the shared client state/fetcher so same-browser account/API calls preserve read-after-write continuity.

Implemented the shared client-only session actor bootstrap and static authenticated shells. Account, admin, and prize-redemption routes render without SSR account/D1 reads; guards and feature composables share the keyed session-actor bootstrap. The public event detail page now renders only public SSR data and hydrates account actions/access through usePublicEventWorkspaceAccess after hydration. The shared API client owns X-D1-Bookmark capture and forwarding, including mutation-followed-by-read continuity.

Validation: bun run lint passed; bun run typecheck passed; bun run test:unit passed (129 files / 944 tests); bun run test:integration passed (32 files / 398 tests); focused public/access/bootstrap tests passed (3 files / 5 tests); local BDD covered public cacheability, authenticated API authorization, bootstrap deduplication, and query-only tab navigation. The full local BDD run reached 59 passing tests and 2 existing team-workspace failures in concurrent TASK-432.3 work; no TASK-432.2 scenario failed. No remote database, deployment, or push was used.

TASK-432.2 reopened for corrective architecture work. TASK-432.5 owns the account-event fan-out collapse and page-shaped endpoint; this pass must not implement it. Final browser topology gate remains pending in TASK-432.7.

Corrective architecture validation: protected async-data uses the shared authorization fingerprint/generation boundary; protected reads carry AbortSignal through account-event bootstrap, judging, team formation, and team submission paths; authenticated raw fetches use the shared client; transport/session/cache/public payload tests pass. Account-event fan-out remains explicitly deferred to TASK-432.5. Local validation passed: bun run lint, bun run typecheck, bun run test:unit (130 files / 952 tests), bun run test:integration (32 files / 399 tests), non-destructive BDD (62/62), and destructive BDD (2/2). TASK-432.7 browser topology gate remains pending, so this task stays In Progress.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Corrective TASK-432.2 architecture findings are implemented and validated locally. The shared authorization cache boundary scopes protected client data, protected reads use cancellation signals, authenticated requests use the shared API client, and session/public-cache tests cover the required invariants. Account-event page-shaped fan-out remains TASK-432.5 scope. TASK-432.2 remains In Progress pending the final real-browser request-topology gate in TASK-432.7.
<!-- SECTION:FINAL_SUMMARY:END -->
