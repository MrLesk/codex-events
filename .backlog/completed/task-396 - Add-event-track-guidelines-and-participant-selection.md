---
id: TASK-396
title: Add event track guidelines and participant selection
status: Done
assignee:
  - Codex
created_date: '2026-06-13 22:02'
updated_date: '2026-06-14 00:20'
labels:
  - events
  - tracks
  - participants
  - staff
  - nuxt
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/schema-outline.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
priority: high
ordinal: 75000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add canonical support for event track short descriptions, participant-facing full markdown guidelines, staff-only instructions, and per-participant track selection from the account event details page. Public event pages should only expose track title and short description. Participant track selection is personal to the application, editable for submitted and approved applications, and used to highlight matching staff plus prefill new team submissions without forcing submission track choice.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Existing track descriptions are renamed to required short descriptions, with optional full descriptions and staff instructions persisted on tracks.
- [x] #2 Public event track payloads and public pages show only track title, short description, and display order; resources/full/staff fields are not exposed publicly.
- [x] #3 Submitted and approved participants can select and later change one event track from account event Details, and the selection is persisted on their application.
- [x] #4 Account Overview prompts submitted/approved participants to choose a track when the event has tracks and they have no selected track.
- [x] #5 Account Details highlights the selected participant track, moves it above other tracks, and shows full description plus resources only for the selected participant track.
- [x] #6 Admins and staff see staff instructions according to role scope: admins/general staff see all tracks, track-specific staff see only their assigned track.
- [x] #7 Account Staff highlights staff assigned to the participant-selected track and does not highlight anyone before a track is selected.
- [x] #8 New submission draft forms prefill from the current participant selected track when valid, without overwriting existing submission tracks or forcing the value.
- [x] #9 Canonical docs and tests are updated for the new fields, route, visibility rules, and submission prefill behavior.
- [x] #10 Required validation commands pass or any inability to run them is reported.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update persistence: add migration 0064 for track field rename/new markdown fields and application selected_track_id; update Drizzle schema and serializers.
2. Update API contracts: use shortDescription/fullDescription/staffInstructions throughout event track input/output, add select-track action route, include selectedTrackId in application and participation summaries, add staffTrackId to session actor roles, and include staff track IDs in published staff roster payloads.
3. Update UI: admin track editor fields, public track panel short-only display, account details track selector/staff visibility modes, overview prompt, staff roster selected-track highlighting, and submission draft track prefill.
4. Update canonical docs for domain model, schema, permissions, and API surface.
5. Add/update unit and integration tests for schema serialization, public/account visibility, participant selection, staff roster data, and submission prefill.
6. Run required validation: lint, typecheck, unit, integration, and bdd; then finalize the task, commit, and push to origin/main.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added canonical event track short descriptions, full participant guidelines, staff-only instructions, and participant selected-track persistence. Public event payloads and pages now expose only track name, short description, and order, while account pages support participant track selection, selected-track resources/guidelines, staff-instruction visibility, staff roster highlighting, and new submission draft prefill. Updated the canonical docs, migration/schema, API serializers, account/public/admin UI, and unit/integration coverage. Validation passed: `bun run lint`, `bun run typecheck`, `bun run test:unit`, `bun run test:integration`, `bun run test:bdd`, and `git diff --check`.
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
