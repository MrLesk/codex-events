---
id: TASK-432.5.3
title: 'Collapse operations, submissions, and judging workspace reads'
status: To Do
assignee:
  - '@luna-workspace'
created_date: '2026-08-19 19:52'
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
- [ ] #1 Operations, submissions, and event judging tabs each use one concrete page-shaped read after bootstrap; the global judge inbox and assignment workspace also each use one read.
- [ ] #2 The listed existing fan-out reads are replaced in the owned client surfaces without server-side HTTP chaining or a generic graph contract.
- [ ] #3 Each page and assignment handler performs one actor resolution, one authorization resolution, and one shared strong D1 session, with role/blind-review visibility enforced server-side.
- [ ] #4 Mutation behavior remains on existing action routes and refreshes only the active typed page state.
- [ ] #5 Tab, inbox, and assignment navigation aborts abandoned work and cannot commit stale responses.
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
