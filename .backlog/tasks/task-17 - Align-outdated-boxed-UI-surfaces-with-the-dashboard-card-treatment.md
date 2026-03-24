---
id: TASK-17
title: Align outdated boxed UI surfaces with the dashboard card treatment
status: Done
assignee:
  - codex
created_date: '2026-03-24 20:45'
updated_date: '2026-03-24 20:58'
labels:
  - ui
  - frontend
  - design-system
dependencies: []
documentation:
  - /Users/alex/projects/codex-hackathons/docs/design-reference.md
  - /Users/alex/projects/codex-hackathons/docs/README.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Identify frontend routes and shared UI surfaces that still use the older boxed treatment seen on the onboarding account page, compare them against the intended dashboard card styling, and update the affected surfaces so the onboarding and hackathon experiences match the current visual system.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The onboarding account page uses the same intended card or box treatment as the dashboard reference instead of the outdated boxed styling.
- [x] #2 The hackathon detail page for the e2e fixture hackathon uses the intended card or box treatment where the outdated styling currently appears.
- [x] #3 Other routes or shared components using the same outdated boxed pattern are identified and updated for consistency within the current app shell.
- [x] #4 Relevant frontend validation for the affected area is run and any necessary test updates are included.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Keep the public hackathon detail page as the visual reference and do not restyle it.
2. Rework `/auth/access` so its layout, spacing, and box treatment align more closely with the flatter public hackathon style rather than the elevated dashboard-card style.
3. Preserve the current auth/access behavior and registration flow while updating only the visual shell and box styling.
4. Revalidate with a fresh screenshot of `/auth/access?returnTo=%2Faccount&mode=register`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Introduced shared `app-inset-*` surface utilities in the global stylesheet and switched `AppInput` plus participant, public, admin, and judging inset panels/forms over to the shared treatment to remove the older flat boxed styling drift.

The old `/onboarding/account` route is now a redirect in the current worktree; the live registration UI is implemented in `/auth/access`, so the onboarding visual fix was applied there and on the related account surfaces.

Manual verification used fresh Playwright screenshots for `/auth/access?mode=register` and `/hackathons/e2e-fixture-hackathon` after the styling pass.

`bun run typecheck` was executed but currently fails on a pre-existing `HackathonRecord` mismatch in `app/pages/admin/hackathons/[hackathonId]/index.vue` (missing `requireChatgptEmail` and `requireOpenaiOrgId`), unrelated to this styling change.

Follow-up correction: the public hackathon detail route was unintentionally restyled even though it should have remained the visual reference. Reverting the public hackathon detail shell and supporting public components while keeping the other surfaces aligned to it.

Corrected the earlier mistake by restoring the public hackathon detail shell and the public timeline/prize/criteria components to their original visual treatment, while keeping the box-style cleanup on the other surfaces.

Reworked `/auth/access` again after review feedback so it follows the flatter public hackathon visual language instead of the elevated dashboard-card treatment. The page now uses the same top header structure, tab-like section switcher, and light boxed sections as the hackathon reference while preserving the existing auth logic.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aligned the outdated boxed UI treatment with the newer dashboard card language by introducing shared `app-inset-card`, `app-inset-card-tight`, `app-inset-field`, and `app-inset-choice` utilities in `app/assets/css/main.css` and wiring `AppInput` to the new field treatment. Applied the shared inset styling across the current registration/access flow, account settings, participant team and submission panels, prize redemption workspace, multiple admin operational panels, and the judging workspace surfaces that still used the older flat boxes.

Corrected the earlier mistake of restyling the public hackathon detail reference surface. The public hackathon detail route and its timeline/prize/criteria support components were restored to their prior visual treatment so that page remains the reference, while the other affected surfaces keep the updated inset card treatment.

Validation: captured fresh Playwright screenshots for `/auth/access?mode=register` and `/hackathons/e2e-fixture-hackathon`. Ran `bun run typecheck`, which currently fails because `app/pages/admin/hackathons/[hackathonId]/index.vue` is using a `HackathonRecord` shape that is missing `requireChatgptEmail` and `requireOpenaiOrgId`; that type error appears unrelated to this styling pass.

Adjusted `/auth/access` after review feedback to match the flatter visual language of the public hackathon detail page rather than the dashboard-style elevated cards. Preserved the current auth and registration behavior while rebuilding the page shell, section headers, tabs, and content boxes around the public reference treatment.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [ ] #3 Relevant validation commands pass
- [x] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
