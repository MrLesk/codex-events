---
id: TASK-432.5.7
title: 'Prove account-workspace request topology, cancellation, and lazy-loading'
status: To Do
assignee:
  - '@luna-workspace'
created_date: '2026-08-19 19:55'
updated_date: '2026-08-19 19:56'
labels:
  - testing
  - performance
dependencies:
  - TASK-432.5.1
  - TASK-432.5.2
  - TASK-432.5.3
  - TASK-432.5.4
  - TASK-432.5.5
  - TASK-432.5.6
parent_task_id: TASK-432.5
type: task
ordinal: 141000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Purpose
Own the verification layer for TASK-432.5. It must prove the real user experience in a local Nuxt + local D1 browser, not just isolated API latency. No production code is owned here; test-only instrumentation and canonical testing guidance are allowed.

Owned new tests
- tests/unit/app/composables/useAccountEventPageRequest.test.ts
- tests/unit/app/domains/events/account-workspace-page.test.ts
- tests/unit/server/domains/events/account-event-page-context.test.ts
- tests/integration/server/api/account-workspace-pages.test.ts
- tests/integration/server/api/account-overview-and-redemption-pages.test.ts
- tests/bdd/features/authenticated/account-event-workspace.feature
- tests/bdd/steps/account-event-workspace.steps.ts

Owned existing test/support files when changes are required
- tests/unit/server/application/operations.test.ts (route inventory/catalog count and generated schema assertions)
- tests/bdd/features/authenticated/admin-configuration.feature
- tests/bdd/features/authenticated/admin-operations.feature
- tests/bdd/features/authenticated/admin-certificates.feature
- tests/bdd/features/authenticated/event-builder.feature
- tests/bdd/features/authenticated/judge-workspace.feature
- tests/bdd/features/authenticated/judging.feature
- tests/bdd/features/authenticated/participant-application.feature
- tests/bdd/features/authenticated/prize-redemptions.feature
- tests/bdd/features/authenticated/talk-proposals.feature
- tests/bdd/features/authenticated/team-formation.feature
- tests/bdd/features/authenticated/team-submission.feature
- tests/bdd/features/authenticated/team-workspace.feature
- tests/bdd/steps/admin-configuration.steps.ts
- tests/bdd/steps/admin-operations.steps.ts
- tests/bdd/steps/admin-certificates.steps.ts
- tests/bdd/steps/event-builder.steps.ts
- tests/bdd/steps/judge-workspace.steps.ts
- tests/bdd/steps/judging.steps.ts
- tests/bdd/steps/participant-application.steps.ts
- tests/bdd/steps/prize-redemptions.steps.ts
- tests/bdd/steps/talk-proposals.steps.ts
- tests/bdd/steps/team-formation.steps.ts
- tests/bdd/steps/team-submission.steps.ts
- tests/bdd/steps/team-workspace.steps.ts
- tests/bdd/support/api-client.ts
- tests/bdd/support/session-state.ts
- tests/bdd/support/platform-fixtures.ts
- tests/support/backend/api-route.ts
- tests/support/backend/runtime.ts
- docs/testing-strategy.md
Do not edit production app/server code, shared D1/bootstrap/media tests, or another child task's implementation files.

Topology assertions
- In a real local browser with a local Nuxt server and local D1 fixture, assert authenticated account-event entry is exactly one shared bootstrap request followed by one /api/account/events/:slug/entry request; no /api/events/slug/:slug, /api/account/events, /api/events/participation, /prizes, /talk-proposals/me, or /credits fan-out is made by the entry surface.
- Assert each selected data-heavy tab/inbox/workspace has exactly one critical page read after the single bootstrap: prizes, operations, submissions, judging, settings, participants, workspace, teams, rosters, gallery, feedback, certificates, global judge inbox, assignment workspace, account overview, staff dashboard, and prize redemption.
- Assert request counts from real browser network events and server-side local request/session instrumentation, not only mocked composables. Request counts must distinguish the bootstrap from the page read and must not hide fan-out behind a client helper.
- Assert query-only tab changes consume the same bootstrap generation and do not request /api/session again. Actor/consent/role/capability generation changes invalidate protected page data.

Authorization and contract tests
- For every page family, exercise authorized participant, staff, judge, event admin/platform admin, hidden event, wrong-event, and insufficient-role cases according to the permissions matrix.
- Validate typed apiData envelopes and concrete response fields, including talk-proposal privacy, blind-review redaction, staff read-only visibility, participant/team boundaries, certificate/terms visibility, and media payload boundaries without changing TASK-432.6 behavior.
- Assert each page route resolves actor once, authorization once, and one strong shared D1 session; do not make tests pass through raw binding injection or a replica path.
- Keep operation registry/manifest/generated schema tests aligned through the foundation owner's regeneration; do not hand-edit generated files in this task.

Cancellation and stale-response tests
- Unit-test the shared page request composable with AbortController/dedupe cancel, tab-key changes, component disposal, authorization-generation changes, and a delayed old response.
- In a local browser, deliberately delay an old page response, navigate to a newer tab, and assert the old response cannot paint, overwrite active data, set the active error, or repopulate protected cache state.
- Assert pagination/search requests carry the same signal and are abandoned when the tab is left.

Lazy and network-boundary tests
- Assert editor/sortable code is locally bundled and lazy: settings/builder opens the relevant chunk only when needed, unrelated tabs do not load md-editor-v3/sortablejs, and no runtime request contains unpkg or another CDN editor dependency.
- Keep the test local-only. No test may call codex-events.com, test.codex-events.com, production D1, remote R2, or Auth0 Management APIs.

Required validation
- bun run lint
- bun run typecheck
- bun run test:unit
- bun run test:integration
- bun run test:bdd
- run the focused local browser request-topology scenarios independently when debugging, then run the full suites.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Real local-browser request logs prove one bootstrap plus one critical page read for every owned workspace/page family and prove the old fan-out URLs are absent.
- [ ] #2 Unit and integration tests cover typed response envelopes, permissions/privacy, one actor/authorization/session topology, cancellation, stale-response suppression, and authorization-generation invalidation.
- [ ] #3 BDD scenarios exercise account-event entry, all data-heavy tabs, judge inbox/assignment, settings/editor, remaining account workspaces, mutations, and rapid navigation against local Nuxt + local D1.
- [ ] #4 Lazy local editor/sortable behavior and absence of runtime unpkg/CDN requests are asserted.
- [ ] #5 No production/test code is changed in the inventory phase; the eventual implementation remains local-only until explicitly authorized.
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Owned production route/component/composable/server-domain files: none. This child owns only the explicitly listed tests, BDD support, and docs/testing-strategy.md; implementation children own all production surfaces.
<!-- SECTION:NOTES:END -->
