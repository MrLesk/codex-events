---
id: TASK-284
title: Add in-place gallery dropzone uploads with compact upload status
status: Done
assignee:
  - codex
created_date: '2026-04-19 20:01'
updated_date: '2026-04-19 20:04'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the account hackathon gallery management UI so the gallery area itself accepts dropped photos without adding a separate dropzone above the empty state. While uploads are in flight, show a very compact in-place status strip that lists which files are uploading while preserving the existing gallery layout and controls.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 When a manager views an empty gallery, the existing empty-state area acts as the upload dropzone and click target for picking files.
- [x] #2 When a manager views a populated gallery, dropping image files onto the gallery area uploads them without introducing a separate permanent dropzone above the grid.
- [x] #3 While uploads are running, the gallery shows a compact in-place status UI that identifies the files being uploaded and uses minimal vertical space.
- [x] #4 Existing gallery management behavior, including upload success refresh and public visibility controls, continues to work.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Keep the current upload API path and account wrapper, but track the current batch's filenames there so the UI can show exactly what is uploading.
2. Turn the shared gallery panel into the drop target: the empty state becomes the clickable/drop area, and the existing grid accepts dropped files with only a transient overlay.
3. Add a compact upload strip inside the gallery content area instead of adding another permanent dropzone above it.
4. Update or add the most targeted tests available for the new helper/state behavior, then run lint, typecheck, and unit tests.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
User explicitly asked to reuse the existing empty-state gallery area as the drop target and to avoid adding a separate dropzone above it.

The shared gallery panel now treats the existing empty-state surface as the clickable and draggable upload target, and the populated grid accepts dropped files with only a transient overlay.

Uploads now show a compact in-place strip with the current batch's filenames. The current implementation is batch-level status only; it does not expose byte-level upload percentages because the gallery still uploads as a single fetch/FormData request.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated the account hackathon gallery UI so the existing gallery area doubles as the upload surface. Empty galleries now use the empty-state panel as the click/drop target, populated galleries accept dropped files over the existing grid, and in-flight uploads show a compact chip-based status strip with the filenames being uploaded. Existing upload, refresh, and management actions remain unchanged. Validation passed with bun run lint, bun run typecheck, bun run test:unit, and a targeted unit test for the upload-item helper.
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
