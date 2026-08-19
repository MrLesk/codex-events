---
id: TASK-432.5.4
title: 'Collapse settings, builder, and editor loading'
status: To Do
assignee:
  - '@luna-workspace'
created_date: '2026-08-19 19:53'
labels:
  - architecture
  - performance
dependencies:
  - TASK-432.5.1
parent_task_id: TASK-432.5
type: enhancement
ordinal: 138000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Purpose
Make the settings and builder surfaces one page-shaped read with locally bundled, lazy heavy code. Preserve the existing atomic builder hierarchy and editor behavior; eliminate runtime dependency discovery and any CDN/unpkg path.

Owned client files
- app/components/account/events/AccountEventAdminSettingsPanel.vue
- app/components/account/events/AccountEventAdminTermsCard.vue
- app/composables/useEventBuilder.ts
- app/domains/events/admin-event.ts
- app/domains/events/builder.ts
- app/domains/events/program-settings.ts
- app/components/admin/AdminEditorRowShell.vue
- app/components/admin/AdminMarkdownEditorClient.client.vue
- app/components/admin/AdminMarkdownEditorField.vue
- app/components/admin/AdminSortableEditorRow.vue
- app/components/admin/AdminEventCreateEditForm.vue
- app/components/admin/EventConfigForm.vue
- app/components/admin/EventConfigApplicationFieldsTable.vue
- app/components/admin/EventConfigProgramIdentitySection.vue
- app/components/admin/EventTalkProposalControl.vue
- app/components/admin/builder/AdminBuilderWorkspace.vue
- app/components/admin/builder/molecules/AdminBuilderBlockCard.vue
- app/components/admin/builder/molecules/AdminBuilderChecklistRow.vue
- app/components/admin/builder/molecules/AdminBuilderDurationStepper.vue
- app/components/admin/builder/molecules/AdminBuilderFrictionGauge.vue
- app/components/admin/builder/molecules/AdminBuilderMeterRow.vue
- app/components/admin/builder/molecules/AdminBuilderNameHero.vue
- app/components/admin/builder/molecules/AdminBuilderPaletteTile.vue
- app/components/admin/builder/molecules/AdminBuilderScienceDialog.vue
- app/components/admin/builder/molecules/AdminBuilderScoreRing.vue
- app/components/admin/builder/molecules/AdminBuilderSettingsGroupCard.vue
- app/components/admin/builder/molecules/AdminBuilderSparkline.vue
- app/components/admin/builder/molecules/AdminBuilderTemplateCard.vue
- app/components/admin/builder/molecules/AdminBuilderTipRow.vue
- app/components/admin/builder/molecules/AdminBuilderTrackRow.vue
- app/components/admin/builder/molecules/AdminBuilderWeightSlider.vue
- app/components/admin/builder/organisms/AdminBuilderAgendaTrack.vue
- app/components/admin/builder/organisms/AdminBuilderBasicsForm.vue
- app/components/admin/builder/organisms/AdminBuilderBlockPalette.vue
- app/components/admin/builder/organisms/AdminBuilderEventTypePicker.vue
- app/components/admin/builder/organisms/AdminBuilderSettingsBoard.vue
- app/components/admin/builder/organisms/AdminBuilderSidePanel.vue
- app/components/admin/builder/organisms/AdminBuilderTemplateGallery.vue
- app/pages/admin/events/new.vue
- app/pages/admin/events/builder/new.vue
- app/pages/admin/events/builder/[eventId].vue
- shared/domains/events/account-event-settings-page.ts (new concrete settings contract)
Do not edit the account-event page foundation, operations panels, or shared bootstrap/D1/media code.

Owned new server route/domain files
- server/api/account/events/[slug]/settings.get.ts
- server/domains/events/account-event-settings-page.ts
Existing settings/configuration routes are read-only mutation/read dependencies and must keep their canonical contracts:
- server/api/events/[eventId]/index.get.ts and index.patch.ts
- server/api/events/[eventId]/evaluation-criteria/index.get.ts, index.post.ts, [criterionId].patch.ts, [criterionId].delete.ts
- server/api/events/[eventId]/prizes/index.get.ts, index.post.ts, [prizeId].patch.ts, [prizeId].delete.ts
- server/api/events/[eventId]/roles/index.get.ts, candidates/index.get.ts, [userId].put.ts, [userId].patch.ts, [userId].delete.ts
- server/api/events/[eventId]/terms/current.get.ts
- server/api/events/[eventId]/terms/[documentType]/versions.get.ts and versions.post.ts
- server/api/events/[eventId]/terms/[documentType]/actions/set-current.post.ts
- server/api/events/[eventId]/actions/hide.post.ts, unhide.post.ts
- server/api/events/[eventId]/luma/actions/retry-configuration.post.ts
- server/api/events/[eventId]/images/background.post.ts, background.delete.ts, banner.post.ts, banner.delete.ts
The new read composes domain functions directly; it must not call those HTTP routes.

Current fan-out to eliminate
- useAdminEventSettingsWorkspace currently reads event, evaluation criteria, prizes, application-terms versions, winner-terms versions, and roles as separate requests.
- AccountEventAdminSettingsPanel adds its own event/configuration reads and mutation-triggered re-fetches.
- AdminMarkdownEditor and sortable behavior must remain behind lazy local component boundaries. Do not load the editor or sortable library for unrelated account-event tabs.

Target topology and typed shape
- GET /api/account/events/:slug/settings returns apiData<AccountEventSettingsPage> with the first-render admin event configuration, criteria, prizes, current terms and bounded version metadata, roles/roster state, and builder/editing configuration needed by the selected settings surface.
- The response is one concrete contract, not a resource map or include/query graph. Builder defaults and editing schema are typed; server authorization decides which fields are present.
- After the account bootstrap, settings makes exactly one critical page read. Updates continue to use existing PATCH/action routes and merge the typed response or perform one settings-page refresh; no bootstrap refresh and no old six-request reload.
- Admin builder creation/edit pages should use the same typed event configuration contract where they have an existing event, and must not create a second account/session read.

Authorization, D1, and cancellation
- The settings handler resolves the request actor once, requires event-admin/platform-admin access once, and performs all settings reads through one strong request-scoped D1 database/session.
- Do not trust client capabilities, use raw D1, create a standalone Drizzle client, use replica consistency, call server routes over HTTP, or perform Auth0/identity work on the read path.
- Settings route/tab changes and editor unmount abort the active page request. Signal-aware mutation refreshes must not commit stale settings after a newer tab or event selection. Editor draft state is local to the editor and is not replaced by an aborted response.
- Keep image/media mutation and cache semantics owned by TASK-432.6; this task only consumes the event's current typed image fields and preserves the existing upload/delete action URLs.

Lazy local bundling
- Keep md-editor-v3 and its CSS in the local package graph behind AdminMarkdownEditorClient.client.vue plus LazyAdminMarkdownEditorField/ClientOnly. No runtime import from unpkg or another CDN.
- Load sortablejs only when the settings/builder sortable interaction mounts (the current local dynamic import can be retained or narrowed); it must not enter the initial account-event route chunk.
- Keep the builder's molecules/organisms atomic tree. Pages own data and mutation orchestration; templates/organisms receive typed props and emit events; do not add a parallel editor/form component family.
- Add source/build/network assertions that no unpkg URL is emitted or requested and that editor/sortable chunks are absent from unrelated tabs.

Dependencies
TASK-432.5.1. This task can run in parallel with entry, operations, people, and remaining-workspace tasks after the foundation contract is available.

Validation
- Unit: event-builder schema/defaults, settings contract, terms/criteria/prize composition, lazy component boundaries.
- Integration: event-admin/platform-admin permissions, hidden/draft event handling, one actor/authorization/session assertion, and settings mutation/read-after-write.
- Local browser/Bdd: classic settings and builder pages render after one bootstrap plus one settings read; editor/sortable code loads only on the relevant interaction; no unpkg request; aborted settings navigation preserves the newer state.
- Required eventual checks: bun run lint, bun run typecheck, bun run test:unit, bun run test:integration, bun run test:bdd. No remote/test/prod calls.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The settings surface uses one typed page read after bootstrap and removes the current event/criteria/prizes/terms/roles request fan-out.
- [ ] #2 Builder and editor pages preserve the atomic component tree and use local lazy bundles for md-editor-v3 and sortablejs; runtime unpkg/CDN dependencies are absent.
- [ ] #3 The settings page handler performs one actor resolution, one event-admin authorization resolution, and one shared strong D1 session.
- [ ] #4 Settings mutations remain separate canonical actions and cannot cause a full bootstrap or multi-endpoint reload.
- [ ] #5 Aborted settings/editor navigation cannot overwrite newer draft or active-page state.
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
