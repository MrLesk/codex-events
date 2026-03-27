---
id: TASK-46
title: Normalize hackathon slug input live on create/edit forms
status: Done
assignee: []
created_date: '2026-03-27 20:25'
updated_date: '2026-03-27 20:26'
labels:
  - frontend
  - admin
  - validation
dependencies: []
references:
  - app/components/admin/AdminHackathonCreateEditForm.vue
  - app/pages/admin/hackathons/new.vue
  - 'app/pages/account/hackathons/[slug]/admin/index.vue'
  - app/utils/admin-workspace.ts
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Ensure hackathon slug input on both create and edit pages enforces slug-safe characters while typing. Spaces should be converted to hyphens, uppercase should normalize to lowercase, and non-slug characters should be removed. Applies to the shared create/edit form component used by both routes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Slug input normalizes live while typing on create page
- [x] #2 Slug input normalizes live while typing on edit page
- [x] #3 Spaces become hyphens and only lowercase letters, numbers, and hyphens remain
- [x] #4 Validation remains passing locally with unit tests
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented slug normalization in the shared create/edit wrapper so behavior applies to both routes using the same component.

Change details:
- `app/components/admin/AdminHackathonCreateEditForm.vue`
  - Updated slug watcher to normalize `form.slug` on every change using `createHackathonSlug`.
  - If current input differs from normalized value, it immediately writes normalized slug back to state, enforcing allowed characters and replacing spaces.
  - Existing create-mode manual-edit detection now compares normalized slug against name-derived slug.

Added focused utility coverage updates:
- `tests/unit/app/utils/admin-workspace.test.ts`
  - Extended slug test with symbol/whitespace and mixed-case/underscore examples to confirm expected normalization outputs.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Done. Slug input is now normalized live while typing for both create and edit pages (shared component path).

Behavior now:
- spaces become `-`
- uppercase normalizes to lowercase
- unsupported characters are removed
- slug is kept in standard `[a-z0-9-]` shape

Files changed:
- `app/components/admin/AdminHackathonCreateEditForm.vue`
- `tests/unit/app/utils/admin-workspace.test.ts`

Validation run:
- `bunx eslint app/components/admin/AdminHackathonCreateEditForm.vue tests/unit/app/utils/admin-workspace.test.ts`
- `bun run typecheck`
- `bun run test:unit`
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
