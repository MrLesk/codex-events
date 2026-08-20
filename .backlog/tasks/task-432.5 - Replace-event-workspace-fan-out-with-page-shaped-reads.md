---
id: TASK-432.5
title: Replace event workspace fan-out with page-shaped reads
status: In Progress
assignee:
  - '@luna-workspace'
created_date: '2026-08-19 06:22'
updated_date: '2026-08-20 21:47'
labels: []
dependencies:
  - TASK-432.2
  - TASK-432.3
  - TASK-432.4
references:
  - 'app/pages/account/events/[slug]/index.vue'
  - app/composables/useAdminWorkspace.ts
  - app/components/account/events/AccountEventAdminOperationsPanel.vue
parent_task_id: TASK-432
priority: high
type: enhancement
ordinal: 132000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Give each event workspace tab one typed server-owned read model so a tab does not independently fetch session, event, role, and multiple domain resources. Preserve existing event behavior and atomic component boundaries.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Operations, submissions, settings, participants, staff, and other data-heavy tabs each have at most one critical page-data request after bootstrap
- [x] #2 Each page-shaped route resolves authorization once and executes its D1 work through the shared request client
- [x] #3 The event route component remains a composition surface and domain panels receive typed props and emit mutations
- [x] #4 Tab changes cancel abandoned requests and do not allow stale responses to update the active view
- [x] #5 Heavy editor code is locally bundled and loaded only for tabs that use it; runtime unpkg dependencies are removed
- [x] #6 Unit, integration, and local browser tests verify response contracts, permissions, request counts, cancellation, and tab behavior
- [x] #7 The account event workspace's current separate event, prizes, account-events, participation, talk-proposals, and credits reads are explicit scope for this task: collapse them into the page-shaped tab read and prove the entry no longer fans out after bootstrap; do not count TASK-432.2 as complete until this is addressed here.
- [x] #8 Every discovered account-event tab/workspace group has exactly one child owner with an explicit route/component/composable/server-domain write scope and dependency.
- [x] #9 The shared foundation and generated route-registry ownership are explicit; no child invents a generic graph API or duplicates TASK-432.2, TASK-432.4, or TASK-432.6 corrections.
- [x] #10 The implementation order and final validation are local-only, with no commit, push, deployment, or remote/test/prod database access in this phase.
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
1. Complete TASK-432.5.1 first as the shared contract/request-topology checkpoint. It depends on TASK-432.2, TASK-432.3, and TASK-432.4 and owns the page envelope, signal-aware client helper, event page context, shared useAdminWorkspace boundary, route convention, and final shared registry integration.
2. After the foundation contract is available, run these disjoint implementation tracks in parallel:
   - TASK-432.5.2 entry/common shell plus prizes/outcomes.
   - TASK-432.5.3 operations, submissions, judging, judge inbox, and assignment workspace.
   - TASK-432.5.4 settings, builder, editor, local lazy bundling, and unpkg prohibition.
   - TASK-432.5.5 participant workspace/teams, participants, staff/judge rosters, roles, gallery, feedback, and certificates.
   - TASK-432.5.6 account overview, staff dashboard, and prize redemption.
3. Run TASK-432.5.7 after all six implementation tracks. It owns browser-visible request counting, local D1 contract/permission tests, cancellation/stale-response tests, and lazy-loading/network assertions.
4. Keep the foundation owner as the integration owner for server/application/operations/eligibility-manifest.ts and the generated catalog/output-schema files. Child route workers provide route metadata and do not edit generated/shared registry files. Reconcile those files after the concrete route definitions exist, then update docs/api-surface.md from the implemented route inventory.
5. Final handoff is local-only: run lint, typecheck, unit, integration, and BDD suites; inspect the worktree; do not push, deploy, access remote/test/prod, or commit during this architecture phase.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Concrete deferred scope recorded: account event entry fan-out is owned by TASK-432.5, not the TASK-432.2 bootstrap correction. No page-shaped endpoint work belongs in TASK-432.2.

Inventory and decomposition recorded from committed local source, local tests, and canonical docs. Current account event entry is a 1,870-line route composition surface that reads event detail, prizes, the full account event list, the full participation list, optional own talk proposal, and conditional credits before tab activation; panels/composables add team, submission, roster, judge, outcome, and prize-redemption fan-out. Current useAdminWorkspace.ts is shared by settings and operations and is therefore intentionally foundation-owned rather than split across child tasks.

Child dependency graph:
- TASK-432.5.1 -> TASK-432.2, TASK-432.3, TASK-432.4.
- TASK-432.5.2, TASK-432.5.3, TASK-432.5.4, TASK-432.5.5, TASK-432.5.6 -> TASK-432.5.1.
- TASK-432.5.7 -> TASK-432.5.1, TASK-432.5.2, TASK-432.5.3, TASK-432.5.4, TASK-432.5.5, TASK-432.5.6.

Unavoidable shared ownership:
- TASK-432.5.1 owns app/composables/useAdminWorkspace.ts because both current settings and operations workspaces depend on it.
- TASK-432.5.1 owns server/application/operations/eligibility-manifest.ts and the generated operation catalog/output schemas as the final reconciliation surface for all new structured page routes.
- TASK-432.5.5 owns AccountEventParticipantsPanel.vue; TASK-432.5.3 consumes its typed presentational boundary and must not edit it.
- The account-event page remains owned by TASK-432.5.2; all other child panels are disjoint feature owners and receive typed props/events.
- Existing shared bootstrap/cancellation (TASK-432.2), D1/session/bookmark (TASK-432.4), and managed media/cache (TASK-432.6) corrections are dependencies/exclusions, not duplicated scope.

Architecture rules for all children: one bootstrap plus one critical page read per tab/workspace; one actor resolution, one authorization resolution, one strong request-scoped D1 session; concrete apiData<T> contracts; no HTTP fan-out, raw D1, replica path, feature-local /api/session, generic graph API, compatibility dual-read, or runtime unpkg. Tab/pagination/imperative reads are signal-aware and stale-safe. All validation is against local Nuxt + local D1/browser fixtures until separate authorization is given.

Exact local candidate dfe6fb6d0c4f972b9a0040be71e6bcfe0501d483: MCP generators clean; bun run lint and bun run typecheck pass; unit 155 files/1047 tests; integration 40 files/455 tests; Cloudflare build pass; workflow topology 2/2; focused Chromium topology 22/22 with zero API, console, or page errors, usable timings about 171-655ms, Settings local editor with zero CDN requests, and one intentional cancellation abort; full BDD 85/85 and destructive BDD 2/2. No remote deployment, CI, test URL, CF-Cache-Status, or remote cache evidence exists. Independent review found no P0, P1, or P2; nonblocking P3: an invalid or denied entry-family tab query may remain in the URL after a 403/404 entry response, without a data leak. Children .5.1-.6 are locally integrated and individually assessed. The topology child is locally green for its 22-scenario matrix and full BDD, but its literal every-workspace browser criterion remains open because the stable staff-dashboard persona is absent; the gap is documented in docs/testing-strategy.md. Parent AC #1 remains unchecked for the same reason. Parent remains In Progress. The nonblocking invalid/denied entry-family tab URL P3 is recorded for follow-up. No remote deployment or CI evidence is claimed.
<!-- SECTION:NOTES:END -->
