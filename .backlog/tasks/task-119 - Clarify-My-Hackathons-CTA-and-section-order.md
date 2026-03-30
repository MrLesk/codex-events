---
id: TASK-119
title: Clarify My Hackathons CTA and section order
status: Done
assignee: []
created_date: '2026-03-30 16:46'
updated_date: '2026-03-30 16:46'
labels:
  - ui
  - account-workspace
dependencies: []
documentation:
  - app/pages/account/index.vue
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make the account My Hackathons page lead with the user’s upcoming participation and separate the public discovery CTA from the personal workspace content so the Explore hackathons action no longer reads like part of the user’s existing hackathons list.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The My Hackathons page no longer places the Explore hackathons CTA inline with the page title
- [x] #2 Upcoming hackathons render before current and past sections when present
- [x] #3 The page includes a separate public-discovery callout with copy that clearly frames Explore hackathons as finding more hackathons to join
- [x] #4 Validation notes capture the changed-file checks and any existing repo-wide blockers
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Remove the header-level `Explore hackathons` CTA from `app/pages/account/index.vue` and keep the page title focused on the user’s own hackathons.
2. Reorder the non-empty participation sections so `Upcoming` appears before `Current`, while preserving the existing `Past` section after them.
3. Add a separate public-discovery callout below the personal hackathon sections with copy that frames the CTA as finding more hackathons to join.
4. Run focused validation (`eslint`, `typecheck`, `test:unit`) and record the existing repo-wide lint blocker.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Clarified the My Hackathons page IA so the user’s own participation content leads and public discovery is framed as a separate next step.

What changed:
- Removed the header-level `Explore hackathons` CTA from `app/pages/account/index.vue` so the page title focuses only on the user’s own hackathons.
- Reordered the non-empty sections so `Upcoming` renders before `Current`, followed by `Past`.
- Added a separate bottom callout with participant-facing copy: `Find more hackathons to join`, followed by a description and the `Explore hackathons` CTA.

Validation:
- `bun x eslint app/pages/account/index.vue`
- `bun run typecheck`
- `bun run test:unit`

Remaining limitation:
- `bun run lint` still fails in unrelated existing files outside this task (`server/middleware/local-d1-binding.ts`, `tests/support/backend/api-route.ts`, and `tests/unit/server/routes/auth/account-linking.test.ts`).
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [ ] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [ ] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
