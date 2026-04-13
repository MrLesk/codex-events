---
id: TASK-215
title: Refine public and account hackathon tracks presentation
status: Done
assignee:
  - Codex
created_date: '2026-04-13 20:00'
updated_date: '2026-04-13 20:09'
labels:
  - ui
  - hackathons
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refresh the shared hackathon tracks panel so configured tracks feel intentional and premium on both the public details page and the account-scoped details page. Keep the existing track data model and placement, but replace the current plain grid with a stronger header treatment and a track list presentation that feels closer to the published awards surface.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The shared hackathon tracks panel uses a richer header treatment with iconography and hierarchy that matches the detail-page visual language.
- [x] #2 Configured tracks render in a presentation style that feels consistent with the published awards surface rather than generic boxed cards.
- [x] #3 The redesigned panel works on both the public hackathon details page and the account-scoped hackathon details page without changing track data requirements or placement.
- [x] #4 The updated tracks panel remains responsive and preserves clear ordering and readable descriptions on small screens.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Redesign the shared `HackathonTracksPanel` only, keeping its inputs, placement, and ordering logic unchanged.
2. Reuse local detail-page visual patterns: agenda-style section header treatment with iconography and prize-list-style vertical content rhythm for each track.
3. Keep the panel responsive and readable on mobile without introducing a separate account-only variant.
4. Verify the updated panel on both the public details page and the account-scoped details page, then run `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
User confirmed the refreshed shared tracks presentation should apply to both the public details page and the account-scoped details page.

Redesigned the shared `HackathonTracksPanel` to use agenda-style section chrome and a prize-list-style vertical track layout. Verified the refreshed panel on both the public hackathon details page and the account-scoped details page in Chrome.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Refined the shared hackathon tracks presentation across public and account details pages by replacing the plain grid with a stronger icon-led section header and a cleaner vertical list layout. Validation passed with `bun run lint`, `bun run typecheck`, and `bun run test:unit`. Canonical docs were confirmed unchanged because the change is presentation-only.

Final polish simplified the row treatment by switching the per-track icon to a directional arrow and removing ordinal labels so the track names carry the hierarchy directly.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
