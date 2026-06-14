---
id: TASK-397
title: Use build tracks in registration before AI Knowledge
status: Done
assignee:
  - Codex
created_date: '2026-06-14 00:22'
updated_date: '2026-06-14 15:15'
labels:
  - applications
  - events
  - tracks
  - build
  - nuxt
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/api-surface.md
  - docs/permissions-matrix.md
priority: high
ordinal: 76000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
For Build event registration, show a track selector instead of the AI Knowledge selector when the event has configured tracks. If a Build event has no configured tracks, keep the existing AI Knowledge selector behavior as the fallback.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Build registration shows a required track selector when the Build event has one or more tracks.
- [x] #2 Build registration hides the AI Knowledge selector while the track selector is shown.
- [x] #3 Build registration keeps the existing AI Knowledge selector behavior when the Build event has no tracks.
- [x] #4 Submitted Build applications store the selected track on `selectedTrackId`.
- [x] #5 Server validation accepts selected-track Build applications without requiring AI Knowledge when tracks exist, and rejects missing or invalid selected tracks for Build events with tracks.
- [x] #6 Docs and tests are updated for the registration behavior.
- [x] #7 Required validation commands pass or any inability to run them is reported.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Pass authenticated event track options with IDs into the public registration panel.
2. Add registration form state and validation for selected Build tracks, hiding AI Knowledge when Build tracks exist.
3. Update application submission API to validate and persist `selectedTrackId` during registration.
4. Update canonical docs and unit/integration coverage.
5. Run required validation and finalize the task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented Build registration track selection using authenticated event track options; Build events with tracks require selectedTrackId and skip AI Knowledge validation/storage, while Build events without tracks keep the AI Knowledge fallback. Validation passed: bun run lint, bun run typecheck, bun run test:unit, bun run test:integration, bun run test:bdd.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Build registration now uses event tracks before AI Knowledge: participants select a track when a Build event has tracks, the API validates and stores selectedTrackId, and Build events without tracks keep the existing AI Knowledge fallback. Updated docs and unit/integration coverage; full lint, typecheck, unit, integration, and BDD validation passed.
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
