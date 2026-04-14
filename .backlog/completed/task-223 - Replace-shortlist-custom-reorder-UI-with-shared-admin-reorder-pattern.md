---
id: TASK-223
title: Replace shortlist custom reorder UI with shared admin reorder pattern
status: Done
assignee:
  - '@codex'
created_date: '2026-04-14 21:02'
updated_date: '2026-04-14 21:06'
labels:
  - admin-ui
  - shortlist
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the admin shortlist editor to use the same reorder interaction pattern already used for agenda items and track items instead of the bespoke shortlist drag/move controls.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Shortlist ordering uses the existing admin reorder interaction pattern used elsewhere in the app instead of bespoke shortlist-only controls.
- [x] #2 Admins can reorder shortlisted teams with drag and drop and move up/down controls without changing shortlist behavior.
- [x] #3 Required validation passes locally: bun run lint, bun run typecheck, and bun run test:unit.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Replaced the bespoke shortlist drag-and-drop implementation in `app/components/admin/AdminCompetitionShortlistPanel.vue` with the repo’s standard admin reorder pattern using `AdminEditorRowShell`, `Sortable`, and `moveListItemByIndex`.

The shortlist panel now uses the same icon-based move up / drag handle / move down controls and drop-target styling already used for agenda, track, criteria, and prize editors. Existing shortlist-specific save/start behavior and the current `data-testid` hooks for move/rank/save were preserved so current BDD flows still target the same shortlist actions.

Canonical docs were confirmed unchanged because this is an implementation cleanup rather than a product-rule change.

Validation passed locally:
- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`

Testing note: no dedicated shortlist component test was added because the user-facing shortlist reorder/save behavior was kept intact and existing admin competition BDD coverage already exercises that flow. The drag handle itself is not separately automated today.

Risks / follow-up:
- `AdminCompetitionFinalDeliberationPanel.vue` still uses the older bespoke reorder implementation, so the competition workspace is not fully standardized yet.
<!-- SECTION:FINAL_SUMMARY:END -->

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
