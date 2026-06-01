---
id: TASK-363
title: Hide team size on non-hackathon event headers
status: Done
assignee:
  - Codex
created_date: '2026-06-01 20:36'
updated_date: '2026-06-01 20:38'
labels:
  - bug
  - ui
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/permissions-matrix.md
modified_files:
  - app/domains/events/presentation.ts
  - app/pages/account/admin.vue
  - app/pages/account/judging.vue
  - tests/unit/app/domains/events/presentation.test.ts
priority: medium
ordinal: 61000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Non-hackathon event surfaces should not show team size metadata. The event header currently displays a max/team value for a non-hackathon event, which exposes hackathon-specific participation language where it does not apply.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Non-hackathon event headers do not display max/team or team size metadata.
- [x] #2 Hackathon event headers still display the configured team size metadata where that field is part of the visible event summary.
- [x] #3 Other event header metadata, including location, status, and slug, remains unchanged.
- [x] #4 Relevant tests or validation cover the event-kind-specific display behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Locate the event header metadata rendering path that produces max/team text.
2. Confirm how event kind/type is represented in the event object and nearby tests.
3. Update the renderer/helper so team size metadata is included only for hackathon events.
4. Add or update a focused test showing non-hackathon headers omit team size while hackathons retain it.
5. Run required validation for code changes: bun run lint, bun run typecheck, and bun run test:unit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Confirmed canonical docs already model meetup and build events as registration-only and team member limits as hackathon-specific, so no documentation change was needed.

Added a shared presentation helper for dashboard team-size metadata and used it in the admin and judge dashboard list builders. The helper preserves the compact max/team label for hackathons and returns no item for meetup/build events.

Validation passed: bun test tests/unit/app/domains/events/presentation.test.ts; bun run lint; bun run typecheck; bun run test:unit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Summary:
- Added a shared event presentation helper that returns compact dashboard team-size metadata only for hackathon events.
- Updated the admin and judge dashboard event list metadata to use the helper, so meetup/build event headers no longer show max/team text while hackathons keep the existing compact label.
- Added unit coverage for hackathon, meetup, and build behavior.

Validation:
- bun test tests/unit/app/domains/events/presentation.test.ts
- bun run lint
- bun run typecheck
- bun run test:unit

Docs/config:
- Canonical docs already identify meetup/build as registration-only and team member limits as hackathon-specific; no docs or config changes were required.

Risks/follow-ups:
- No known follow-ups.
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
