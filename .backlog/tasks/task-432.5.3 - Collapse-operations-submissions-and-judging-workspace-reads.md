---
id: TASK-432.5.3
title: 'Collapse operations, submissions, and judging workspace reads'
status: Done
assignee:
  - '@luna-workspace'
created_date: '2026-08-19 19:52'
updated_date: '2026-08-20 21:47'
labels:
  - architecture
  - performance
dependencies:
  - TASK-432.5.1
parent_task_id: TASK-432.5
type: enhancement
ordinal: 137000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Purpose
Refactor the admin competition operations, submissions, and judging surfaces so each event tab/inbox/assignment has one server-owned first-render read. Preserve lifecycle and mutation semantics; the new reads are page contracts, not a graph API.

Owned client files
- app/components/account/events/AccountEventAdminOperationsPanel.vue
- app/components/account/events/AccountEventJudgePanel.vue
- app/components/admin/AdminCompetitionShortlistPanel.vue
- app/components/admin/AdminCompetitionAssignmentsPanel.vue
- app/components/admin/AdminCompetitionPitchStagePanel.vue
- app/components/admin/AdminCompetitionPitchReviewPanel.vue
- app/components/admin/AdminCompetitionFinalDeliberationPanel.vue
- app/components/admin/AdminCompetitionPrizeRedemptionsPanel.vue
- app/components/admin/AdminSubmissionInterventionsPanel.vue
- app/components/admin/AdminTeamsOperationsPanel.vue
- app/components/judging/BlindSubmissionPanel.vue
- app/components/judging/JudgeAssignmentInboxCard.vue
- app/components/judging/JudgeAssignmentStatusBadge.vue
- app/components/judging/JudgeAssignmentWorkspacePanel.vue
- app/components/judging/JudgeReviewActionFooter.vue
- app/components/judging/JudgeReviewRubric.vue
- app/components/judging/JudgeSubmissionPanel.vue
- app/components/judging/PitchSubmissionPanel.vue
- app/composables/useJudgeWorkspace.ts
- app/pages/account/judging.vue
- app/pages/events/[slug]/judging/assignments/[assignmentId].vue
- app/domains/judging/admin-oversight.ts
- app/domains/judging/criteria-config.ts
- app/domains/judging/query.ts
- app/domains/judging/workspace.ts
- app/domains/submissions/admin-operations.ts
- app/domains/submissions/admin-submission-record.ts
- app/domains/applications/admin-application-record.ts
- app/domains/applications/admin-application-review.ts
- app/domains/teams/admin-team-record.ts
- shared/domains/events/account-event-operations-page.ts (new concrete contract)
- shared/domains/events/account-event-submissions-page.ts (new concrete contract)
- shared/domains/events/account-event-judging-page.ts (new concrete contract)
Do not edit the shared foundation files or people/settings components.

Owned new server page routes/domain assemblers
- server/api/account/events/[slug]/operations.get.ts
- server/api/account/events/[slug]/submissions.get.ts
- server/api/account/events/[slug]/judging.get.ts
- server/api/account/judging.get.ts (global judge inbox replacing event-list plus per-event assignment fan-out)
- server/api/account/events/[slug]/judging/assignments/[assignmentId].get.ts
- server/domains/events/account-event-operations-page.ts
- server/domains/events/account-event-submissions-page.ts
- server/domains/events/account-event-judging-page.ts
- server/domains/judging/account-judge-inbox-page.ts
Existing reads and mutations remain canonical, read-only dependencies:
- GET reads: server/api/events/[eventId]/index.get.ts, judging/summary.get.ts, submissions/summary.get.ts, teams/submission-monitor.get.ts, applications/index.get.ts, shortlist/index.get.ts, final-deliberation/index.get.ts, winners/index.get.ts, prize-redemptions/index.get.ts, judging/assignments/index.get.ts, judging/assignments/[assignmentId]/index.get.ts, leaderboard/index.get.ts, no-submission-teams/index.get.ts, evaluation-criteria/index.get.ts
- action routes: server/api/events/[eventId]/actions/start-judging-preparation.post.ts, start-blind-review.post.ts, start-shortlist.post.ts, start-pitch.post.ts, start-pitch-review.post.ts, advance-pitch-presentation.post.ts, start-final-deliberation.post.ts, announce-winners.post.ts, complete.post.ts; applications/[applicationId]/actions/approve.post.ts, reject.post.ts, withdraw.post.ts, undo-withdrawal.post.ts, applications/actions/apply-staged-decisions.post.ts; teams/[teamId]/submission/actions/admin-withdraw.post.ts and disqualify.post.ts; judging/assignments/[assignmentId]/actions/reassign.post.ts and force-skip.post.ts; shortlist/actions/select-finalists.post.ts; final-deliberation/actions/reorder.post.ts.
Do not make the new page handlers call these routes over HTTP. Keep existing mutation URLs and refresh only the active typed page contract.

Current fan-out to eliminate
- useAdminEventOperationsWorkspace currently reads event, prizes, roles, paginated teams, judging assignments, and leaderboard.
- AccountEventAdminOperationsPanel then reads judging/summary, submissions/summary, submission-monitor, paginated applications, shortlist, final-deliberation, winners, and prize-redemptions, with conditional child-panel reads and mutation-triggered refreshes.
- useJudgeWorkspace reads the whole /api/events list and then one /judging/assignments request per reviewable event.
- The assignment workspace currently obtains event, assignment, and criteria through separate paths. Use one assignment-page read.

Target topology and typed shapes
- GET /api/account/events/:slug/operations returns apiData<AccountEventOperationsPage>: event state/phase, operational counters, lifecycle/action availability, assignment oversight summary, shortlist/final-deliberation/winner state, and redemption summary needed for the first Operations render.
- GET /api/account/events/:slug/submissions returns apiData<AccountEventSubmissionsPage>: event state, submission summary, submission monitor/no-submission team data, and the bounded first page of intervention records needed for the first Submissions render. Pagination or searches after first render are explicit user-triggered requests and must remain signal-aware.
- GET /api/account/events/:slug/judging returns apiData<AccountEventJudgingPage>: event state, caller role/mode, assignment/coverage summary, leaderboard or review queue data required by that tab, and criteria only when the caller is a reviewer who needs it.
- GET /api/account/judging returns apiData<AccountJudgeInboxPage> with the reviewable event/assignment inbox in one bounded contract; it replaces /api/events pagination plus Promise.all assignment reads.
- GET /api/account/events/:slug/judging/assignments/:assignmentId returns one concrete assignment workspace with event, assignment, blind-safe submission, criteria, and current review state. It must not issue separate client bootstrap/event/criteria reads.
- Keep response types concrete and bounded. Do not add an include list, arbitrary resource map, or generic graph endpoint. Server-computed role/mode fields are display hints only; every mutation and protected read still enforces canonical authorization.
- The event route component and panels compose downward: page/composable owns request state and mutation refresh; child panels receive typed props and emit user-intent events. Do not let child panels call page reads directly.

Authorization, D1, and cancellation
- Each page handler resolves the request actor once, resolves the appropriate event-admin/staff/judge/assignment authorization once through the shared foundation, and uses one strong request-scoped D1 database/session for all domain reads.
- The assignment handler combines event/assignment/judge authorization into one resolved page context; it must not independently call actor/authorization/database accessors for each sub-read.
- Do not use raw D1, standalone Drizzle, H3 injection, replica consistency, server-side HTTP calls, Auth0 network calls, or client-supplied capabilities.
- The composables use the foundation signal-aware request helper. Tab/inbox/assignment navigation aborts prior work and stale/aborted responses do not commit. Pagination and fan-out helpers receive the same signal.
- Mutation routes remain separate and must invalidate/refresh only the affected page contract; no full account bootstrap refresh and no old multi-request reload.

Dependencies
TASK-432.5.1. This task can run in parallel with entry, settings, people, and remaining-workspace tasks after the foundation contract is available.

Validation
- Unit: concrete operation/submission/judging/assignment contract mapping and existing judging/submission state machines.
- Integration: event-admin, judge, staff, blind-review, assignment, lifecycle, and forbidden-access matrices; assert one actor/authorization/session path and bounded first-page response.
- Local browser/Bdd: operations/submissions/judging tabs, global judge inbox, and assignment page each show one bootstrap plus one critical read; lifecycle mutation refreshes only the active page; rapid navigation cannot paint stale results.
- Required eventual checks: bun run lint, bun run typecheck, bun run test:unit, bun run test:integration, bun run test:bdd. No remote/test/prod calls.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Operations, submissions, and event judging tabs each use one concrete page-shaped read after bootstrap; the global judge inbox and assignment workspace also each use one read.
- [x] #2 The listed existing fan-out reads are replaced in the owned client surfaces without server-side HTTP chaining or a generic graph contract.
- [x] #3 Each page and assignment handler performs one actor resolution, one authorization resolution, and one shared strong D1 session, with role/blind-review visibility enforced server-side.
- [x] #4 Mutation behavior remains on existing action routes and refreshes only the active typed page state.
- [x] #5 Tab, inbox, and assignment navigation aborts abandoned work and cannot commit stale responses.
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
1. Inventory the committed foundation route, context, and request APIs plus current operations, submissions, judging, inbox, and assignment fan-out callers within the owned write scope.
2. Define concrete typed shared contracts and server assemblers for operations, submissions, event judging, the global judge inbox, and the assignment workspace using one foundation context and no internal HTTP calls.
3. Replace owned client fan-out with signal-aware page requests, keep mutation routes separate, scope protected data by authorization generation, and prevent stale response commits.
4. Add contract, permission, query-topology, cancellation, and request-count tests; record exact route metadata for TASK-432.5.1 generated-catalog integration without editing generated or shared foundation files.
5. Run scoped and required repository checks, inspect the ownership-only diff, and commit locally without push, deploy, or remote D1.

6. Correct the global judge inbox and assignment detail handlers to use named page executors with mandatory authorization before loaders.
7. Replace contract escape hatches with strict concrete Zod shapes and remove unknown casts from the owned server assemblers.
8. Add exact authorization ordering, output rejection, actor/database reuse, and route parity coverage; leave generated catalogs for the foundation integrator.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Started implementation after reading the committed TASK-432.5.1 foundation. Shared foundation, generated operation catalogs/manifest, media, D1 internals, and other child-owned files remain excluded. Component map: route/page composables own request state and refresh; Operations/Judging/Submissions panels receive typed page props and emit mutation intents; judge inbox and assignment pages own their concrete page request; server assemblers own page read models and use the foundation context.

Validation evidence: scoped ESLint passes. Focused Vitest passes: 4 files, 11 tests, including contract shape, request topology, protected inbox and assignment request execution, stale assignment cancellation, and foundation stale-tab cancellation.

Repository checks: bun run lint is blocked by concurrent server/database/non-http.ts errors at lines 17, 71, 100, 107, and 370. bun run typecheck is blocked by concurrent server/database/non-http.ts line 214 and AppDatabase.get callers in server/domains/mcp/tokens.ts line 90 and server/domains/talk-proposals/index.ts line 201. bun run test:unit reports 8 failures in concurrent team formation, D1 boundary/client, operation manifest, and talk proposals work; 985 of 993 tests passed. bun run test:integration reports 328 failures and 90 passes because the concurrent D1 facade makes actor resolution fail at database.select(...).limit(...).get, with additional AppDatabase.get failures. The new competition-page integration tests are blocked at that same actor-resolution boundary. bun run test:bdd could not start because localhost:3100 was already in use; no remote or deployed environment was used.

Shared registry integration metadata, owned by TASK-432.5.1 integrator: include these five GET routes in the generated catalog and MCP eligibility manifest with output data and effect read. 1) id get.account.events.by-slug.operations, tool get_account_events_by_slug_operations, path /api/account/events/:slug/operations, params slug, capabilities event_admin. 2) id get.account.events.by-slug.submissions, tool get_account_events_by_slug_submissions, path /api/account/events/:slug/submissions, params slug, capabilities event_admin. 3) id get.account.events.by-slug.judging, tool get_account_events_by_slug_judging, path /api/account/events/:slug/judging, params slug, capabilities event_judge and event_admin. 4) id get.account.judging, tool get_account_judging, path /api/account/judging, no params, capability event_judge. 5) id get.account.events.by-slug.judging.assignments.by-assignmentId, tool get_account_events_by_slug_judging_assignments_by_assignmentId, path /api/account/events/:slug/judging/assignments/:assignmentId, params slug and assignmentId, capability event_judge. Mark each manifest route include.

Ownership handoff: generated operation catalogs and manifests, shared foundation, and parent page prop wiring remain intentionally untouched for the integrator.

Panel boundary handoff: AccountEventAdminOperationsPanel now requires page: AccountEventOperationsPage | AccountEventSubmissionsPage | null plus canManage, isLoading, loadErrorMessage, and refreshPage. AccountEventJudgePanel now requires page: AccountEventJudgingPage | null and assignmentPage: AccountJudgeAssignmentWorkspacePage | null plus the matching loading/error/refresh props. The parent event route must own the operations/submissions/judging page requests, pass these props, abort tab/assignment changes through the shared request helper, and refresh only the active page after mutations. This parent wiring is intentionally not edited in this slice.

Post-refactor typecheck confirms the expected integrator boundary: the untouched parent app/pages/account/events/[slug]/index.vue reports four missing typed page props at lines 1644, 1658, 1714, and 1727 for the new judge/operations/submissions panels. It also retains the unrelated concurrent server/api/events/[eventId]/index.patch.ts talkProposalQuestionsRevision type error.

Server contract checkpoint: judging assignment detail and global judge inbox now use named executors with mandatory authorization before page loaders; global overview/staff/prize workspaces use the same actor/database/authorize/load/parse executor boundary. Owned operations, submissions, judging, entry, and prizes payloads now use concrete Zod schemas with no z.unknown/passthrough output escape hatches or unknown casts in server assemblers. Added exact authorization-order/output-rejection/context-count/route-registry tests and corrected the topology test to assert the new inbox boundary. Focused validation: bun run lint passed; bun run typecheck passed; 5 focused unit files/13 tests passed; 2 focused integration files/8 tests passed. Full unit remains 147 files/1009 tests with only the pre-existing useTeamFormationWorkspace timeout and generated-operation inventory mismatch; full integration retains pre-existing media/profile-revision and API-envelope assertion failures; BDD was blocked by localhost:3100 already being used. Generated catalogs/manifests remain intentionally untouched for TASK-432.5.1 integration. No remote D1, deploy, or push.

Exact local candidate dfe6fb6d0c4f972b9a0040be71e6bcfe0501d483: MCP generators clean; bun run lint and bun run typecheck pass; unit 155 files/1047 tests; integration 40 files/455 tests; Cloudflare build pass; workflow topology 2/2; focused Chromium topology 22/22 with zero API, console, or page errors, usable timings about 171-655ms, Settings local editor with zero CDN requests, and one intentional cancellation abort; full BDD 85/85 and destructive BDD 2/2. No remote deployment, CI, test URL, CF-Cache-Status, or remote cache evidence exists. Independent review found no P0, P1, or P2; nonblocking P3: an invalid or denied entry-family tab query may remain in the URL after a 403/404 entry response, without a data leak.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Operations, submissions, judging, judge inbox, and assignment page reads are complete at dfe6fb6d. Named executors authorize before loading, use concrete contracts and the shared strong request session, preserve blind-review visibility, and keep mutations separate. The final local gate passed; no remote deployment or CI evidence is claimed.
<!-- SECTION:FINAL_SUMMARY:END -->
