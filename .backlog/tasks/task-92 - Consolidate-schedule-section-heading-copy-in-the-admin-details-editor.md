---
id: TASK-92
title: Consolidate schedule section heading copy in the admin details editor
status: Done
assignee:
  - Codex
created_date: '2026-03-29 17:07'
updated_date: '2026-03-29 17:07'
labels:
  - admin
  - ui
  - hackathons
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Simplify the schedule section in the hackathon Details admin flow so the section uses one clear header and supporting sentence instead of repeating schedule and agenda labels. The schedule card should explain its purpose and reordering controls without a second nested heading inside the editor body.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The schedule section uses a single top-level heading and supporting sentence for the details-mode editor.
- [x] #2 The nested Agenda items label and helper text are removed from the schedule editor body.
- [x] #3 The remaining schedule helper copy still explains that admins are editing what participants see and how reordering works.
- [x] #4 Validation is rerun for the updated shared admin schedule form copy.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Confirmed canonical docs remain unchanged for this copy-only admin editor cleanup. Removed the nested agenda heading block from the shared hackathon config form and moved the participant-facing/reorder guidance into the details-mode schedule section subtitle. Validation completed with bun run typecheck and bun run test:unit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Consolidated the Details schedule editor copy so the section now relies on one schedule heading and supporting sentence instead of repeating a nested Agenda items label. The shared mode-view copy was updated to explain both participant-facing impact and reordering, and the redundant inner helper block was removed from the form.

Validation: bun run typecheck, bun run test:unit.
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
