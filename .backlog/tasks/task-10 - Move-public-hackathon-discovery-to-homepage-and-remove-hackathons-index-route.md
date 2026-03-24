---
id: TASK-10
title: Move public hackathon discovery to homepage and remove /hackathons index route
status: Done
assignee: []
created_date: '2026-03-24 19:10'
updated_date: '2026-03-24 19:13'
labels:
  - frontend
  - routing
  - design-system
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the current homepage with the public hackathon discovery surface, simplify the public shell header, hide the sidebar on the homepage, remove the `/hackathons` index page, and update internal links so public discovery lives only at `/`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The public hackathon discovery experience is rendered at `/`.
- [x] #2 The `/hackathons` index page no longer exists as a route file.
- [x] #3 The public header only shows the brand, theme toggle, and sign-in/profile controls without hackathon/public navigation items.
- [x] #4 Typecheck and lint pass after the route and shell changes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Moved the public hackathon discovery surface onto `app/pages/index.vue` and deleted `app/pages/hackathons/index.vue`, so `/hackathons` no longer exists as an index route.

Simplified `app/app.vue` so the top bar keeps only the brand, theme switch, and sign-in/profile control, while the homepage renders without the workspace sidebar.

Switched the app font stack to the Figma/system sans family in `app/assets/css/main.css`, updated navigation/discovery links from `/hackathons` to `/`, and adjusted the public-hackathon BDD step definitions to open the homepage.

Validation passed with `bun run typecheck` and `bun run lint`. The full BDD/browser suite was not run in this pass.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Replaced the old landing page with the public hackathon discovery homepage, removed the standalone `/hackathons` index route file, and simplified the shell header to the brand plus theme and login/profile controls. Updated internal discovery links to point at `/`, kept slug-based public hackathon detail routes intact, and aligned the app font stack with the Figma export's system sans family. `bun run typecheck` and `bun run lint` both pass; the full BDD suite was not run in this pass.
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
