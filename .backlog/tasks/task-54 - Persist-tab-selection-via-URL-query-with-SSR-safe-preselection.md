---
id: TASK-54
title: Persist tab selection via URL query with SSR-safe preselection
status: Done
assignee: []
created_date: '2026-03-28 11:16'
updated_date: '2026-03-28 11:20'
labels:
  - frontend
  - routing
  - ux
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Ensure all in-page tabbed surfaces persist selected tab in URL and restore from URL on reload/share. Use SSR-compatible initialization so selected tab does not flicker after hydration.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Public hackathon detail page (`/hackathons/:slug`) uses `?tab=` to select `overview|prizes|details` and preserves the selected tab on reload/share.
- [x] #2 Participant hackathon workspace page (`/account/hackathons/:slug`) uses `?tab=` to select `overview|prizes|judges|staff|team|submission` and preserves selection on reload/share.
- [x] #3 Homepage hackathon filter tabs (`/`) persist `active|past` via `?tab=` and restore correctly on reload/share.
- [x] #4 Invalid `tab` query values fall back to page default without runtime errors.
- [x] #5 Tab selection is derived from route query during SSR initial render to avoid post-load tab switching.
- [x] #6 Existing query params (for example `notice`) are preserved when tab changes update the URL.
- [x] #7 Unit tests cover tab query parsing/update helper behavior.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented URL-persisted tab selection with SSR-safe preselection for all in-page tab surfaces.

Code changes:
- Added shared helper `app/utils/tab-query.ts`:
  - `normalizeTabQueryValue(...)` normalizes `route.query.tab` values (array/null/whitespace/casing safe)
  - `resolveTabQueryValue(...)` resolves against allowed tab sets with a fallback.
- Updated homepage tabs (`app/pages/index.vue`):
  - Active/Past state now derives from `route.query.tab` during SSR via computed value.
  - Tab clicks push URL query updates (`?tab=active|past`) while preserving existing query/hash.
- Updated public hackathon detail tabs (`app/pages/hackathons/[slug]/index.vue`):
  - Active tab now derives from `route.query.tab` during SSR.
  - Tab clicks push URL query updates (`?tab=overview|prizes|details`) while preserving existing query/hash.
  - Existing auto-fallback from unavailable prizes tab now corrects URL to `tab=overview` with `replace`.
- Updated participant hackathon workspace tabs (`app/pages/account/hackathons/[slug]/index.vue`):
  - Active tab now derives from `route.query.tab` during SSR.
  - Tab clicks push URL query updates (`?tab=overview|prizes|judges|staff|team|submission`) while preserving existing query/hash and existing `notice` query behavior.
  - Existing auto-fallback from unavailable prizes tab now corrects URL to `tab=overview` with `replace`.
- Added unit tests `tests/unit/app/utils/tab-query.test.ts` covering normalization, array handling, fallback behavior, and allowed-tab resolution.

Validation:
- `bun run test:unit` ✅ passed (34 files, 153 tests).
- `bun run typecheck` ❌ fails due pre-existing unrelated server typing issues in:
  - `server/api/hackathons/[hackathonId]/applications/actions/apply-staged-decisions.post.ts`
  - `server/api/hackathons/[hackathonId]/applications/index.post.ts`
  (no new tab-query related type errors remained).
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
