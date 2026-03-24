---
id: TASK-14
title: Tighten public hackathon detail parity with Figma reference
status: Done
assignee:
  - codex
created_date: '2026-03-24 20:01'
updated_date: '2026-03-24 20:20'
labels:
  - frontend
  - public-discovery
  - design
dependencies: []
references:
  - 'http://localhost:5173/hackathons/codex-spring-26'
  - 'http://localhost:3000/hackathons/e2e-fixture-hackathon'
  - '/Users/alex/projects/codex-hackathons/app/pages/hackathons/[slug]/index.vue'
  - >-
    /Users/alex/projects/codex-hackathons/Figma-Design/src/app/pages/HackathonDetail.tsx
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the public hackathon detail route so the core detail composition more closely matches the Figma reference at http://localhost:5173/hackathons/codex-spring-26 while preserving the current public route behavior and documented product constraints. The user explicitly accepts differences in the surrounding shell such as header, footer, and sidebar; the focus is the hackathon detail surface itself.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The public hackathon detail hero and overview composition visually track the Figma reference much more closely in spacing, card treatment, and hierarchy.
- [x] #2 Public-only behavior remains intact and does not expose admin-only controls or role-specific workspace actions on the public route.
- [x] #3 Existing public hackathon detail data continues to render from current APIs without breaking participant registration behavior.
- [x] #4 Validation is run for the changed frontend surface, and any remaining parity gaps are documented.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the public hackathon detail hero to mirror the Figma detail header hierarchy more closely: back link, title, state badge, summary line, divider, and primary Register CTA spacing.
2. Recompose the first screen into a Figma-style overview section with three compact status cards and a larger About card using darker card surfaces and tighter spacing.
3. Keep the route public-only by omitting admin controls and role tabs, while moving terms, registration, criteria, and prizes into lower-priority secondary sections so the top of the page matches the reference more closely.
4. Adjust supporting public hackathon components only where necessary for parity, then validate with typecheck, lint, and manual browser comparison against the Figma reference and local route.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Compared the public detail route directly against the local Figma reference in DevTools at desktop and mobile widths. Kept the route public-only and moved the extra participant-registration/terms panels below the Figma-like overview instead of removing them.

Reworked the top of the page to mirror the Figma composition more closely: tighter title row, active section nav, three compact overview cards, and a larger About card. Updated the third overview card to present public judging/lifecycle facts using current API data rather than admin-only metrics.

Validation passed with `bun run typecheck` and `bun run lint`. Manual browser checks were performed against `http://localhost:3000/hackathons/e2e-fixture-hackathon` and the Figma reference at `http://localhost:5173/hackathons/codex-spring-26`.

No automated tests were added in this pass because the change is primarily visual/layout-level and existing route behavior plus participant registration selectors were preserved.

Reopened after user feedback that the remaining mismatch is primarily spacing and padding. Follow-up pass will focus on measured layout deltas rather than structural changes.

User called out that the remaining mismatch is specifically the three overview cards. Follow-up pass will stop approximating through AppCard and instead mirror the Figma card markup, type sizing, and padding directly.

Applying the same literal Figma translation approach to the About card: replace the AppCard wrapper with direct markup and match the exported spacing and typography instead of approximating through shared card styles.

Updated the header row to use literal Figma-style title and status-pill typography instead of the shared badge component. The Register CTA now sits on the same row as the title block at desktop widths, matching the Figma header composition more closely.

User changed scope for the public detail page: remove the registration and criteria sections from the page and leave only the overview stack plus prizes. The tab row will be reduced to Overview and Prizes accordingly.

Reduced the public detail surface to Overview and Prizes only. Removed the registration and criteria sections from the page body and simplified the tab row to match the narrower surface.

User requested one more consistency pass: restyle the awards block to match the literal Figma treatment used for the About and overview cards rather than the heavier shared-card presentation.

Restyled the awards block to use the same literal section treatment as the About card and top overview cards: direct section markup, `p-6`, simpler title rhythm, and flatter prize rows instead of the older elevated shared-card look.

User requested medal treatment for podium ranks in the awards block. Follow-up will add gold, silver, and bronze cup affordances for rank 1-3 while leaving non-podium ranks unchanged.

Flattened the awards list per user feedback: removed the nested inner prize box and switched to a single divided list inside the section, while keeping podium trophy markers for ranks 1-3.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated the public hackathon detail route to track the Figma hackathon detail composition much more closely without exposing admin-only controls on the public surface. The page header now uses a tighter Figma-style hierarchy with a section-nav row, the first screen is centered on three compact overview cards plus a large About card, and the public-only registration/terms/criteria/prize panels were moved into a lower-priority secondary details section so the initial viewport reads like the reference.

The supporting overview card component was adjusted so the third card presents public judging/lifecycle information using available public data instead of the previous generic lifecycle panel. Existing public APIs and participant registration behavior were preserved, including the top Register CTA and the participant application panel/selector hooks.

Validation ran with `bun run typecheck` and `bun run lint`, plus manual browser comparison in DevTools at desktop and mobile widths. Remaining parity gap: the Figma reference is an admin-capable screen with role-specific tabs and controls, while this route intentionally remains a public detail page, so the implementation stops short of copying admin-only actions or workspace sections.
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
