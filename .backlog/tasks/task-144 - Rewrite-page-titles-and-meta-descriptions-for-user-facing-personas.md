---
id: TASK-144
title: Rewrite page titles and meta descriptions for user-facing personas
status: Done
assignee:
  - codex
created_date: '2026-04-01 18:29'
updated_date: '2026-04-01 18:34'
labels: []
dependencies: []
documentation:
  - /Users/alex/projects/codex-hackathons/docs/README.md
  - /Users/alex/projects/codex-hackathons/docs/domain-model.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update route metadata so titles and meta descriptions are written for the actual platform actor on each page instead of contributors or internal implementation language. Remove app-level fallback SEO copy, add explicit page metadata where it is missing, and make shared multi-role routes describe the active user intent clearly.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Every routable page under app/pages has explicit title and meta description content or is intentionally handled as a redirect-only route
- [x] #2 No page title or meta description mentions implementation technologies or internal workspace terminology that is not useful to the actor on that page
- [x] #3 The account hackathon route uses active-tab-aware metadata so participant, judge, staff, and admin views are described by their current intent
- [x] #4 The app-level fallback SEO title and description are removed from app/app.vue
- [x] #5 Local validation passes with bun run lint bun run typecheck and bun run test:unit
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Remove the global title and description from app/app.vue so routes do not inherit contributor-facing SEO copy.
2. Add explicit useSeoMeta definitions to all pages missing route metadata, including account settings, hackathon creation, and the auth access redirect route.
3. Rewrite existing page titles and descriptions to describe the actor's intent in plain user-facing language and avoid implementation terms.
4. Make /account/hackathons/:slug metadata depend on the active tab so participant, judge, staff, and admin views describe the current section accurately.
5. Run lint, typecheck, and unit tests; then record validation outcomes and any remaining gaps in the task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Confirmed canonical docs remained unchanged for this metadata-only pass.

Removed app-level SEO title and description so no route inherits contributor-facing metadata.

Added explicit page metadata to the previously uncovered routes: account settings, create hackathon, and auth access.

Made the shared account hackathon route tab-aware for metadata and extracted the mapping into app/utils/account-hackathon-seo.ts with unit coverage.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Rewrote page titles and meta descriptions across the route tree so they speak to the actual actor on each page instead of contributors or internal implementation language. The app-level fallback SEO title and description were removed from app/app.vue, explicit metadata was added to every route under app/pages, and static and dynamic routes were updated to use clearer participant, judge, admin, winner, and legal-reader phrasing.

The shared /account/hackathons/:slug route now derives metadata from the active tab instead of using one generic account-workspace label. That tab-aware mapping was extracted into app/utils/account-hackathon-seo.ts and covered with a new unit test in tests/unit/app/utils/account-hackathon-seo.test.ts.

Validation run locally:
- bun run lint
- bun run typecheck
- bun run test:unit

No canonical docs required changes for this work. An unrelated untracked file, report.md, was present in the worktree and was left untouched.
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
