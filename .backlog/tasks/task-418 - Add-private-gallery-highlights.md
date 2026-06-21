---
id: TASK-418
title: Add private gallery highlights
status: Done
assignee:
  - '@codex'
created_date: '2026-06-21 21:07'
updated_date: '2026-06-21 21:20'
labels:
  - frontend
  - backend
  - gallery
dependencies: []
ordinal: 97000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Event admins can curate the account-scoped gallery separately from public visibility. Public gallery behavior stays unchanged: only photos marked public appear there. The private account gallery supports highlights so participants can see the curated set first while still having access to the full event archive.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Public event gallery behavior and routes remain based only on public visibility
- [x] #2 Event photos have a highlighted flag exposed in account-scoped gallery records
- [x] #3 Existing event photo rows are backfilled as highlighted, while newly uploaded photos default to not highlighted and not public
- [x] #4 Account event gallery users can switch between highlights and all photos
- [x] #5 Gallery managers can filter by all, highlighted, not highlighted, and public photos
- [x] #6 Gallery managers can mark a photo highlighted or remove its highlight without changing public visibility
- [x] #7 Tests cover the new data contract, default upload state, backfill, and highlight update permissions
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add an event_photos highlighted flag with a migration that backfills existing rows as highlighted and keeps new rows unhighlighted by default.
2. Extend account-scoped event photo records, serialization, upload defaults, and add a manager-only highlight update route without changing public gallery filters/routes.
3. Update the account gallery UI to default participants to Highlights when highlights exist, expose Highlights/All to all viewers, and expose All/Highlighted/Not highlighted/Public plus highlight toggle controls to managers.
4. Update canonical docs and focused tests for schema, upload defaults, permissions, private filtering, and unchanged public gallery behavior.
5. Run required validation, finalize TASK-418, commit, and push on main.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented private gallery highlights with a D1 migration that backfills existing event_photos as highlighted. New uploads remain unhighlighted and not public. Public gallery reads still depend only on is_publicly_visible and do not serialize the highlighted flag. Validation passed: git diff --check; bun run lint; bun run typecheck; bun run test:unit (109 files, 762 tests); bun run test:integration (24 files, 349 tests); bun run test:bdd (47 public/authenticated tests and 2 destructive authenticated tests). No separate setup/config changes were needed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added account-scoped gallery highlights without changing the public gallery. Existing photos are backfilled as highlighted, new uploads default to unhighlighted/private, managers can toggle highlights and filter curation views, and participants can switch between Highlights and All photos.
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
