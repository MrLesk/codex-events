---
id: TASK-354
title: Allow admins to view draft event banner images
status: Done
assignee: []
created_date: '2026-05-31 20:33'
updated_date: '2026-05-31 20:37'
labels:
  - bug
dependencies: []
modified_files:
  - 'server/api/public/events/[slug]/images/banner.get.ts'
  - tests/integration/server/api/event-routes.test.ts
priority: high
ordinal: 54000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Draft event banner previews currently 404 for event admins and platform admins because the public banner image endpoint resolves events through the public-only lookup while the background endpoint uses caller-visible event lookup. Align banner image access with the documented event image permissions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Event admins can read uploaded banner image bytes for draft events they administer.
- [x] #2 Unauthenticated public callers still cannot read draft event banner images.
- [x] #3 Banner image access matches background image access behavior.
- [x] #4 Validation passes for the changed code.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aligned the public banner image endpoint with the background image endpoint by resolving events through caller-visible event access. Event admins and platform admins can now preview uploaded banner images for draft events while unauthenticated public callers still receive `event_not_found` for draft event slugs. Added integration coverage for admin draft-banner preview and unauthenticated draft denial. Validation: `bun run lint`, `bun run typecheck`, `bun run test:unit`, `bun run test:integration`, and `git diff --check` passed. `bun run test:bdd` was attempted and still fails during fixture reset because existing BDD fixture SQL inserts judge criterion scores above the current 1..5 CHECK constraint before browser specs run.
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
