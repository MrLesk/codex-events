---
id: TASK-13
title: Match public hackathon detail page to Figma-style public layout
status: Done
assignee: []
created_date: '2026-03-24 19:43'
updated_date: '2026-03-24 19:46'
labels:
  - frontend
  - public-discovery
  - design
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the public hackathon detail route to better match the Figma detail screen for logged-out users, keep the public shell free of workspace/sidebar chrome, and replace participant-facing submit-project wording with the standard register CTA where appropriate.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The logged-out public hackathon detail page visually aligns with the Figma detail composition more closely than the current implementation.
- [x] #2 The public detail route does not show workspace/sidebar chrome for logged-out users.
- [x] #3 The primary public participation CTA uses Register wording instead of Submit Project.
- [x] #4 Existing public detail data and route behavior continue to work with current APIs.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Updated the app shell so the public hackathon detail route uses the public shell instead of workspace chrome.

Replaced the oversized public-detail hero composition with a flatter Figma-style header layout and a primary Register CTA.

Changed participant-facing public CTA copy from application/submit wording to Register while keeping the existing participant-application selectors intact.

Validated with `bun run typecheck` and `bun run lint`. DevTools browser pass confirmed the logged-out detail route renders without sidebar chrome.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Public hackathon detail now uses the public shell, presents a flatter Figma-style header layout, and uses Register as the primary participation CTA instead of submit-project/application wording. Validation passed with typecheck and lint; browser behavior was checked manually in DevTools. No automated tests were added in this pass because the existing selectors remain stable and the change is primarily visual/copy-level.
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
