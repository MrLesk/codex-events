---
id: TASK-361
title: Treat registration-open events as active in event filters
status: Done
assignee:
  - Codex
created_date: '2026-06-01 19:05'
updated_date: '2026-06-01 19:14'
labels:
  - events
  - ui
dependencies: []
documentation:
  - docs/lifecycle-and-state-machines.md
  - docs/domain-model.md
modified_files:
  - app/domains/events/admin-overview.ts
  - app/domains/events/participation.ts
  - app/domains/events/public-homepage.ts
  - app/pages/account/index.vue
  - app/pages/index.vue
  - tests/unit/app/domains/events/admin-overview.test.ts
  - tests/unit/app/domains/events/participation.test.ts
  - tests/unit/app/domains/events/public-homepage.test.ts
priority: medium
ordinal: 59000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Event dashboards and public event discovery should classify events with open registration as active instead of upcoming wherever events are grouped into active, upcoming, and past buckets.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Admin event filters count and show registration-open events under Active, not Upcoming.
- [x] #2 Authenticated non-admin event filters count and show registration-open events under Active, not Upcoming.
- [x] #3 Public event filters count and show registration-open events under Active, not Upcoming.
- [x] #4 Unit tests cover registration-open classification for the affected filter helpers.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Identify the event grouping helpers that classify records into active/upcoming/past for admin, authenticated account, and public event surfaces.
2. Update the shared classification logic so `registration_open` events are treated as active rather than upcoming while preserving draft and completed behavior.
3. Update focused unit tests for the affected helpers, then run the required validation commands for a code change.
4. Commit the Backlog task file together with the code/test changes and push to `origin/main`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Discovery found three filter locations: admin dashboard tab classification in app/domains/events/admin-overview.ts, authenticated participant current/upcoming grouping in app/pages/account/index.vue, and public homepage active/past filtering in app/pages/index.vue. Public already treated non-completed states as active; the change extracted that into a tested helper.

Validation passed: bun run lint, bun run typecheck, bun run test:unit, bun run test:bdd, and bun run test:integration. BDD and integration were run before the final type-only import tightening in public-homepage.ts; lint/typecheck/unit were rerun after that final edit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Summary:
- Treated `registration_open` events as active in the admin overview tab classifier even when the derived event start time is still in the future.
- Moved participant upcoming classification into a tested domain helper and used it on the account events page so registration-open events remain in Current/active grouping.
- Extracted the public homepage active/past classifier into a tested helper, preserving the existing public behavior that all non-completed events are active.

Validation:
- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`
- `bun run test:bdd`
- `bun run test:integration`

Risks/follow-ups:
- No docs, config, auth, or permission model updates were required. The public list already had the desired runtime behavior; this task added explicit test coverage around it.
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
