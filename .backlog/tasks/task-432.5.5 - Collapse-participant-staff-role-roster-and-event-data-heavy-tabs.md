---
id: TASK-432.5.5
title: 'Collapse participant, staff, role, roster, and event data-heavy tabs'
status: Done
assignee:
  - '@luna-workspace'
created_date: '2026-08-19 19:53'
updated_date: '2026-08-20 21:47'
labels:
  - architecture
  - performance
dependencies:
  - TASK-432.5.1
parent_task_id: TASK-432.5
type: enhancement
ordinal: 139000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Purpose
Give participant/team/workspace, staff/judge roster, participant visibility, gallery, feedback, and certificate tabs one typed first-render read each. This task owns event-scoped people and remaining data-heavy tabs; the separate account staff dashboard, account overview, and prize-redemption workspace are in TASK-432.5.6.

Owned client files
- app/components/account/events/AccountEventParticipantTeamPanel.vue
- app/components/account/events/AccountEventParticipantWorkspacePanel.vue
- app/components/account/events/AccountEventParticipantVisibilityPanel.vue
- app/components/account/events/AccountEventParticipantsPanel.vue
- app/components/account/events/AccountEventPublishedRosterPanel.vue
- app/components/account/events/AccountEventRoleRosterPanel.vue
- app/components/account/events/AccountEventGalleryPanel.vue
- app/components/account/events/AccountEventFeedbackPanel.vue
- app/components/account/events/AccountEventCertificatesPanel.vue
- app/components/teams/ParticipantTeamDirectoryPanel.vue
- app/components/teams/ParticipantTeamSubmissionPanel.vue
- app/components/teams/ParticipantTeamWorkspacePanel.vue
- app/composables/useTeamFormationWorkspace.ts
- app/composables/useTeamSubmissionWorkspace.ts
- app/composables/useEventRoleRosterWorkspace.ts
- app/pages/events/[slug]/teams/index.vue
- app/pages/events/[slug]/teams/[teamId].vue
- app/domains/teams/admin-team-record.ts
- app/domains/teams/query.ts
- app/domains/teams/team-forms.ts
- app/domains/teams/workspace.ts
- app/domains/applications/participant-application.ts
- app/domains/submissions/team-submission-form.ts
- app/domains/submissions/team-submission.ts
- app/domains/events/gallery.ts
- app/domains/events/published-roster.ts
- app/domains/events/role-roster.ts
- shared/domains/events/account-event-participants-page.ts (new)
- shared/domains/events/account-event-workspace-page.ts (new)
- shared/domains/events/account-event-teams-page.ts (new)
- shared/domains/events/account-event-rosters-page.ts (new)
- shared/domains/events/account-event-gallery-page.ts (new)
- shared/domains/events/account-event-feedback-page.ts (new)
- shared/domains/events/account-event-certificates-page.ts (new)
The account-event ParticipantsPanel is owned here even though the operations panel consumes its presentational props; operations must not edit it. Do not edit the shared foundation, entry, operations, settings, or remaining-workspace files.

Owned new server route/domain files
- server/api/account/events/[slug]/participants.get.ts
- server/api/account/events/[slug]/workspace.get.ts
- server/api/account/events/[slug]/teams.get.ts
- server/api/account/events/[slug]/rosters.get.ts
- server/api/account/events/[slug]/gallery.get.ts
- server/api/account/events/[slug]/feedback.get.ts
- server/api/account/events/[slug]/certificates.get.ts
- server/domains/events/account-event-participants-page.ts
- server/domains/events/account-event-workspace-page.ts
- server/domains/events/account-event-teams-page.ts
- server/domains/events/account-event-rosters-page.ts
- server/domains/events/account-event-gallery-page.ts
- server/domains/events/account-event-feedback-page.ts
- server/domains/events/account-event-certificates-page.ts
Existing route dependencies are read-only and remain canonical:
- server/api/events/[eventId]/applications/me.get.ts
- server/api/events/[eventId]/applications/index.get.ts
- server/api/events/[eventId]/applications/me/actions/select-track.post.ts, set-certificate-visibility.post.ts, verify-luma-email.post.ts, withdraw.post.ts
- server/api/events/[eventId]/teams/index.get.ts, index.post.ts
- server/api/events/[eventId]/teams/[teamId]/index.get.ts, index.patch.ts, join-policy.patch.ts, join-requests/index.get.ts, actions/leave.post.ts
- server/api/events/[eventId]/team-join-requests/index.post.ts and [requestId]/actions/approve.post.ts, reject.post.ts, cancel.post.ts
- server/api/events/[eventId]/teams/[teamId]/members/[userId]/actions/make-admin.post.ts and remove.post.ts
- server/api/events/[eventId]/teams/[teamId]/submission/index.get.ts, index.post.ts, index.patch.ts, actions/submit.post.ts, withdraw.post.ts, public-visibility.patch.ts
- server/api/events/[eventId]/staff/index.get.ts
- server/api/events/[eventId]/judges/index.get.ts
- server/api/events/[eventId]/roles/index.get.ts, candidates/index.get.ts, [userId].put.ts, [userId].patch.ts, [userId].delete.ts
- server/api/events/[eventId]/photos/index.get.ts, index.post.ts, [photoId].delete.ts, [photoId]/highlight.patch.ts, [photoId]/public-visibility.patch.ts
- server/api/events/[eventId]/feedback/index.get.ts
- server/api/events/[eventId]/applications/[applicationId]/actions/override-check-in.post.ts, set-certificate-revocation.post.ts
- server/api/events/[eventId]/applications/actions/send-certificate-emails.post.ts
New page reads must compose domain functions directly, never call these URLs from the server.

Current fan-out to eliminate
- useTeamFormationWorkspace reads own application, visible teams across pages, selected team, and join requests; useTeamSubmissionWorkspace can add a submission read.
- AccountEventParticipantVisibilityPanel reads event plus paginated applications.
- AccountEventPublishedRosterPanel and AccountEventRoleRosterPanel can read published roster, role assignments, and candidate/search data separately.
- Gallery, feedback, and certificates are currently individual reads but need explicit page contracts and request cancellation so tab behavior is consistent and no hidden refresh fan-out remains.
- The page currently passes partial initial workspace/submission/outcome props while the child composables read the same records again.

Target topology and typed shapes
- GET /api/account/events/:slug/participants returns apiData<AccountEventParticipantsPage>: caller-visible participant rows/teams, bounded counts/filters, and the first page required by the staff/admin participant tab.
- GET /api/account/events/:slug/workspace returns apiData<AccountEventWorkspacePage>: the participant's event application, team membership/detail/join state, current submission, outcome/rank, and workflow visibility needed for first render. It replaces application/team/team-detail/join-request/submission fan-out.
- GET /api/account/events/:slug/teams returns apiData<AccountEventTeamsPage>: bounded visible team directory, selected team if requested, and relevant join requests. User-triggered search/load-more remains explicit paginated work and shares the tab signal.
- GET /api/account/events/:slug/rosters returns apiData<AccountEventRostersPage>: published staff/judge rosters plus admin role-assignment state needed for first render. Candidate search and assignment mutations remain explicit follow-up actions, not hidden initial fan-out.
- GET /api/account/events/:slug/gallery returns apiData<AccountEventGalleryPage> with the current visible photo metadata/managed URLs required by the gallery tab; it does not alter TASK-432.6 media/cache behavior or expose stored originals.
- GET /api/account/events/:slug/feedback returns apiData<AccountEventFeedbackPage> with the authorized feedback summary/form state.
- GET /api/account/events/:slug/certificates returns apiData<AccountEventCertificatesPage> with the approved application/certificate state needed for first render; bulk email and revocation actions remain mutations.
- Every response has one concrete typed first-render model and a small common event identity/visibility envelope. Do not add generic resource maps, client include arrays, or cross-tab graph queries.
- Staff access is read-only and participant visibility follows the canonical permissions matrix. Published roster fields stay limited to the documented public roster fields; role-assignment management is server-authorized.

Authorization, D1, and cancellation
- Each page handler resolves the request actor once, resolves the appropriate participant/team/staff/judge/admin authorization once, and uses one strong request-scoped D1 database/session for all composed reads.
- Team/member/submission visibility and certificate eligibility are resolved server-side. Client capabilities and tab labels are never authorization.
- No raw D1, standalone Drizzle, replica consistency, H3 injection, server-side HTTP chaining, Auth0 network call, or identity reconciliation on ordinary reads.
- Every tab request uses the foundation signal-aware helper. Leaving workspace/teams/rosters/gallery/feedback/certificates aborts the prior request; pagination and fan-out helpers receive the signal; an aborted/stale response cannot replace active state.
- Mutation routes remain separate. After a team, roster, visibility, photo, or certificate mutation, refresh only the active page contract or merge its result.

Dependencies
TASK-432.5.1. This task can run in parallel with entry, operations, settings, and remaining-workspace tasks after the foundation contract is available.

Validation
- Unit: team/workspace/roster/gallery/feedback/certificate contract and domain visibility mappings.
- Integration: participant, team member/admin, staff, judge, event-admin, hidden-event, certificate, and photo visibility matrices; assert one actor/authorization/session path.
- Local browser/Bdd: participant workspace/team, staff/participant rosters, role management, gallery, feedback, and certificates each show one bootstrap plus one critical read; pagination/search is explicit; rapid tab changes cannot paint stale data.
- Required eventual checks: bun run lint, bun run typecheck, bun run test:unit, bun run test:integration, bun run test:bdd. No remote/test/prod calls.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Participant workspace/team, participants, rosters, gallery, feedback, and certificates each have one concrete page-shaped first-render read after bootstrap.
- [x] #2 The current team/application/submission, roster/role, and participant visibility fan-outs are removed from the owned client surfaces.
- [x] #3 Every owned page read performs one actor resolution, one canonical authorization resolution, and one shared strong D1 session with server-enforced visibility.
- [x] #4 Staff and participant views preserve their documented field/permission boundaries and mutations remain separate.
- [x] #5 All tab, pagination, and search requests are signal-aware and cannot commit stale data after navigation.
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
1. Define typed participant, team, roster, gallery, feedback, and certificate page contracts with server-owned authorization boundaries. 2. Replace owned client fan-out with signal-aware page reads while preserving atomic props and events. 3. Add contract, permission, redaction, query-topology, and cancellation coverage. 4. Validate the local lint, type, unit, integration, browser, and BDD gates without remote access.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Exact local candidate dfe6fb6d0c4f972b9a0040be71e6bcfe0501d483: MCP generators clean; bun run lint and bun run typecheck pass; unit 155 files/1047 tests; integration 40 files/455 tests; Cloudflare build pass; workflow topology 2/2; focused Chromium topology 22/22 with zero API, console, or page errors, usable timings about 171-655ms, Settings local editor with zero CDN requests, and one intentional cancellation abort; full BDD 85/85 and destructive BDD 2/2. No remote deployment, CI, test URL, CF-Cache-Status, or remote cache evidence exists. Independent review found no P0, P1, or P2; nonblocking P3: an invalid or denied entry-family tab query may remain in the URL after a 403/404 entry response, without a data leak. The participant, team, roster, gallery, feedback, and certificate surfaces are covered by the final page contracts, authorization/redaction tests, and browser topology matrix. Participants uses one bounded /participants read with no /operations request; the final local gate passed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Participant and event-people workspace reads are complete at dfe6fb6d. Participant/team/roster/gallery/feedback/certificate surfaces use bounded page contracts, server authorization and redaction, shared signal-aware requests, and separate mutations. The final local validation and browser topology gate passed; no remote deployment or CI evidence is claimed.
<!-- SECTION:FINAL_SUMMARY:END -->
