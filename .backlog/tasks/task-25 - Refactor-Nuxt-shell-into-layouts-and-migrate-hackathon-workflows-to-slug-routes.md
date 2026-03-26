---
id: TASK-25
title: >-
  Refactor Nuxt shell into layouts and migrate hackathon workflows to slug
  routes
status: Done
assignee: []
created_date: '2026-03-26 18:11'
updated_date: '2026-03-26 18:29'
labels:
  - frontend
  - nuxt
  - routing
  - auth
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace app-level shell branching in app/app.vue with explicit Nuxt layouts, and move hackathon-scoped workflows to /hackathons/:slug/** with middleware-based role gating.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 app/app.vue no longer contains route-conditional shell logic and renders through NuxtLayout
- [x] #2 Three layouts exist (public, profile, hackathon-detail) and pages are assigned to the correct layout
- [x] #3 Hackathon-scoped workflow routes are available under /hackathons/:slug/** and internal navigation links target slug routes
- [x] #4 Role-specific middleware blocks unauthorized actors from hackathon pages and redirects to safe surfaces
- [x] #5 Existing route behavior remains functional via redirects or equivalent compatibility handling
- [x] #6 Typecheck and targeted automated tests covering routing/middleware/layout changes pass
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented a layout-first refactor by reducing app/app.vue to global wrappers and introducing dedicated Nuxt layouts (public, profile, hackathon-detail). Migrated hackathon-scoped admin and judge assignment routes to slug-based paths under /hackathons/:slug/**, updated internal links to slug paths, and added compatibility redirects from legacy id-based routes. Added role-gating middleware for slug-based admin and judging routes and added a server endpoint for resolving caller-visible hackathons by slug. Validation run: typecheck passed, lint passed, integration suite passed, unit app suite passed; the full unit suite has pre-existing unrelated failures in server auth authorization fixtures.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Canonical docs were updated or confirmed unchanged
- [ ] #2 Code behavior matches canonical docs
- [ ] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [ ] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [ ] #7 Auth and permissions changes follow the documented platform model
- [ ] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
