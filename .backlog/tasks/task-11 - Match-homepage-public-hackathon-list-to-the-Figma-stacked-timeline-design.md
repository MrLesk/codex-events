---
id: TASK-11
title: Match homepage public hackathon list to the Figma stacked timeline design
status: Done
assignee: []
created_date: '2026-03-24 19:15'
updated_date: '2026-03-24 19:18'
labels:
  - frontend
  - homepage
  - design-system
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Restyle the homepage public hackathon discovery surface to closely match the Figma stacked list layout, removing the old card grid treatment and replacing the action with a public `Register` CTA while keeping real Nuxt data and public detail routing.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The homepage hackathon list visually follows the Figma stacked timeline layout rather than the previous two-column card grid.
- [x] #2 The homepage does not render `Create New`, and each hackathon card uses `Register` instead of `Manage` or `Explore program`.
- [x] #3 The page still uses the real public hackathon data source and links to the existing public detail routes.
- [x] #4 Typecheck and lint pass after the homepage/card redesign.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Restyled `app/pages/index.vue` to use the Figma-like stacked timeline list with dark filter bar, single-column rows, and homepage-specific dark presentation rather than the previous public card grid.

Rebuilt `app/components/public/hackathons/HackathonCard.vue` around the Figma row layout: left-side status rail, large image panel, compact footer metadata, and a white `Register` CTA instead of the previous public-detail action.

Adjusted the shell chrome in `app/app.vue` so the homepage sits on black/dark surfaces consistent with the target reference while keeping the simplified top bar.

Validation passed with `bun run typecheck` and `bun run lint`. The full browser/BDD suite was not run in this pass.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Matched the homepage public hackathon list much more closely to the Figma stacked timeline design by replacing the old grid-card treatment with dark stacked rows, compact filters, and a white `Register` action. The homepage no longer shows `Create New`, still uses the real public hackathon data source, and still links into the existing public detail routes under `/hackathons/[slug]`. `bun run typecheck` and `bun run lint` both pass; I did not run the full browser/BDD suite in this pass.
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
