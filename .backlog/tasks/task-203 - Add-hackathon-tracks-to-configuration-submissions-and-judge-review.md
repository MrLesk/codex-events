---
id: TASK-203
title: 'Add hackathon tracks to configuration, submissions, and judge review'
status: Done
assignee:
  - codex
created_date: '2026-04-12 19:54'
updated_date: '2026-04-12 20:29'
labels:
  - feature
  - hackathons
  - submissions
  - judging
  - docs
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add optional hackathon tracks as hackathon-owned ordered items with a name and description. Tracks must be configurable during hackathon creation and editable from the account hackathon settings tab. Public and account hackathon detail pages should show configured tracks. When a hackathon has tracks, participant submissions must select exactly one track from that hackathon. Judges should see the selected track in the blind review workspace. Tracks do not affect judge routing or scoring in this version, and no special late-configuration remediation flow is required. Deleting a track that is already referenced by submissions must be blocked.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Canonical docs define hackathon tracks, their relationship to hackathons and submissions, and the reduced-scope product rules for this feature.
- [x] #2 Admins can add, edit, reorder, and delete tracks during hackathon creation and from the account hackathon settings tab.
- [x] #3 Public and account hackathon detail pages display configured tracks when present.
- [x] #4 When a hackathon has tracks, submission create, edit, and submit flows require selecting exactly one valid track from that hackathon and persist the selection.
- [x] #5 Judge review surfaces show the selected track for each reviewed submission without changing blind judging behavior or assignment routing.
- [x] #6 Deleting a track that is already referenced by one or more submissions is rejected.
- [x] #7 Repository validation covers the new track model, submission validation and serialization, judge visibility, and delete blocking.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the canonical docs in docs/domain-model.md, docs/schema-outline.md, docs/api-surface.md, and any related lifecycle/permissions language so tracks are defined as hackathon-owned ordered items with name and description, one submission selects one track when tracks exist, judges can see the selected track, and tracks do not affect routing in this version.
2. Add persistence support in server/database/schema.ts and related server utilities for a hackathon track collection plus a submission track reference, including serialization helpers, validation schemas, and delete blocking when submissions reference a track.
3. Extend hackathon create/update and detail APIs so tracks are configurable from the hackathon form and included in public/account hackathon payloads.
4. Add admin UI for tracks to the hackathon create form and account settings flow, following the existing ordered-list editing patterns used for criteria and prizes while preserving nearby in-progress changes in those files.
5. Extend participant submission types, form validation, and API calls so submissions select a required track when the current hackathon has tracks configured.
6. Extend blind judging serialization and UI so judges can see the selected track without exposing team identity or changing assignment behavior.
7. Add or update unit/integration coverage for docs-aligned validation, serialization, participant submission requirements, judge visibility, and delete blocking, then run bun run lint, bun run typecheck, and bun run test:unit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Updated canonical docs to define HackathonTrack, submission track selection, public/account track visibility, judge visibility, and delete blocking without introducing track-based routing.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added canonical hackathon tracks as ordered hackathon-owned items with name and description, documented in the domain model, schema outline, and API surface. Implemented persistence via a new `hackathon_tracks` table plus `submissions.track_id`, extended hackathon create/update/detail APIs to carry tracks, and blocked removing tracks that are still referenced by submissions.

Updated admin create/settings flows so tracks can be added, edited, reordered, and deleted as part of the existing hackathon configuration form. Public and account hackathon Details tabs now render configured tracks. Participant submission flows now require selecting exactly one valid track when the current hackathon has tracks, and blind judging payloads/UI now show the selected track without changing routing or scoring behavior.

Validation run: `bun run typecheck`, `bun run lint`, and `bun run test:unit` all pass locally. Risks/follow-up: BDD/end-to-end coverage for the new track selection and judge display flow was not added in this change, so that path is still covered only by unit/type validation.
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
