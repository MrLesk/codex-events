---
id: TASK-63
title: Restore light-theme surface contrast across shared UI panels
status: Done
assignee:
  - codex
created_date: '2026-03-28 16:37'
updated_date: '2026-03-28 16:58'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Light theme surfaces currently collapse into the page background in key public and shared UI areas because many components use hard-coded light backgrounds instead of a distinct secondary surface treatment. Investigate the homepage hackathon cards and other shared card/panel surfaces, restore visible hierarchy in light mode, and preserve the current dark-mode separation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Homepage list controls, empty states, and hackathon cards render with a visibly distinct light-theme surface hierarchy instead of blending into the page background.
- [x] #2 Shared card or panel styling used by the affected views applies a consistent light-theme contrast treatment and matches the translucent opacity treatment used by the public hackathon detail agenda surfaces without regressing existing dark-theme behavior.
- [x] #3 Local validation is completed for the affected frontend change set, including the required `bun run test:unit` check.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add reusable light/dark surface utility classes in `app/assets/css/main.css` that match the opacity treatment already used by the public hackathon detail agenda surfaces (`surface-default` outer panels and translucent white nested surfaces).
2. Update shared card primitives and shared hackathon cards (`app/components/AppCard.vue`, `app/components/public/hackathons/HackathonCard.vue`, `app/components/hackathons/HackathonParticipationCard.vue`) to use the new surface hierarchy instead of hard-coded `bg-white` light-mode backgrounds.
3. Update the homepage (`app/pages/index.vue`) to use the same panel treatment for the list controls, empty states, and alert/load-more surfaces.
4. Run targeted validation and the required `bun run test:unit`, then record the result in TASK-63, noting unrelated repo-level typecheck failures if they remain.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added shared `app-surface-panel`, `app-surface-panel-dashed`, and `app-surface-panel-elevated` utilities in `app/assets/css/main.css` and aligned their opacity values to the public hackathon detail agenda surfaces (`bg-default/80` outer, `bg-white/78` inner).

Updated the homepage, `AppCard`, `HackathonCard`, and `HackathonParticipationCard` to consume the shared surface treatment so light mode keeps distinct page, panel, and nested-surface hierarchy.

Validation: manual browser verification on local dev server at `http://localhost:3001/` in both light and dark themes; `bun run test:unit` passed twice. `bun run typecheck` still fails in untouched files (`app/components/public/hackathons/HackathonTimeline.vue`, `server/api/hackathons/[hackathonId]/applications/actions/apply-staged-decisions.post.ts`, and `server/api/hackathons/[hackathonId]/applications/index.post.ts`).

Follow-up cleanup standardized `AppAlert` to the same `rounded-xl` radius and shared panel border treatment as other surfaced cards, which fixes inconsistent alert chrome in the participant status and staged judging notices.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aligned light-theme surface contrast with the existing agenda-panel treatment used on the public hackathon detail page. Added shared surface utility classes in `app/assets/css/main.css` for outer panels and nested translucent surfaces, then applied them to `AppCard`, the public homepage hackathon cards, the shared participation card, and the homepage list/empty/error surfaces so they no longer blend into the white page background.

Validation included manual browser checks on `http://localhost:3001/` in both light and dark themes plus `bun run test:unit` (passing). `bun run typecheck` still reports unrelated pre-existing errors in untouched files under `app/components/public/hackathons/HackathonTimeline.vue` and `server/api/hackathons/[hackathonId]/applications/*`; no type errors were introduced by this change set.

Standardized `AppAlert` itself to use the shared panel radius and border system so status alerts no longer diverge from adjacent cards on pages such as the participant detail view and admin competition panels.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [x] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
