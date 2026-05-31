---
id: TASK-355
title: Show pending indicators for image uploads
status: Done
assignee: []
created_date: '2026-05-31 20:34'
updated_date: '2026-05-31 20:38'
labels:
  - ux
dependencies: []
modified_files:
  - app/components/admin/EventConfigProgramIdentitySection.vue
  - app/pages/account/settings.vue
priority: medium
ordinal: 55000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Image upload controls should show visible pending feedback while an upload is in progress, not only disable controls. Cover managed event background/banner uploads and other image-upload surfaces that currently lack a visible indicator.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Managed event background uploads show a visible loading state while the upload request is pending.
- [x] #2 Managed event banner uploads show a visible loading state while the upload request is pending.
- [x] #3 Other image upload paths without visible pending feedback are updated or confirmed already covered.
- [x] #4 Validation passes for the changed code.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added visible pending states for image uploads that previously only disabled controls. Managed event background and banner upload buttons now show loading indicators and inline status text during upload. Account profile icon upload now shows a spinner overlay on the avatar and inline status text while uploading. Event gallery uploads were audited and already had visible upload button loading plus upload item/status rows, so no gallery code change was needed. Validation: `bun run lint`, `bun run typecheck`, `bun run test:unit`, `bun run test:integration`, and `git diff --check` passed. `bun run test:bdd` was attempted and still fails during fixture reset because existing BDD fixture SQL inserts judge criterion scores above the current 1..5 CHECK constraint before browser specs run. No component tests were added because the repo does not currently have practical Vue component-test coverage for these presentational helpers.
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
