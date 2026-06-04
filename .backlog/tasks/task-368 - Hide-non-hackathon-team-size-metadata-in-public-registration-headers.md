---
id: TASK-368
title: Hide non-hackathon team size metadata in public registration headers
status: Done
assignee: []
created_date: '2026-06-04 16:13'
updated_date: '2026-06-04 16:15'
labels:
  - ui
  - events
dependencies: []
documentation:
  - docs/domain-model.md
modified_files:
  - app/domains/events/presentation.ts
  - 'app/pages/events/[slug]/register.vue'
  - 'app/pages/events/[slug]/application-terms.vue'
  - 'app/pages/events/[slug]/feedback.vue'
  - tests/unit/app/domains/events/presentation.test.ts
priority: low
ordinal: 65000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Meetup and Build events are registration-only, so their public registration-related headers should not show the hackathon-specific maximum team member count. Keep the team-size metadata visible for Hackathon events.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Registration, application terms, and feedback page header summaries omit max team members for Meetup and Build events.
- [x] #2 The same header summaries still show the maximum team member count for Hackathon events.
- [x] #3 The change does not alter event APIs, schemas, schedules, registration submission behavior, or team formation behavior.
- [x] #4 Unit coverage verifies the presentation helper returns team-size metadata only for Hackathon events.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Add a shared event presentation helper that returns registration header team-size metadata only for hackathon events. Use that helper in the public registration, application terms, and feedback page header summaries. Extend the event presentation unit tests for hackathon, meetup, and build event types, then run lint, typecheck, and unit tests.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented as a presentation-only change. `getEventRegistrationTeamSizeMetaItems` reuses `formatMaxTeamMembers` for hackathons and returns no metadata for meetups/builds, matching the domain model that non-hackathon events are registration-only. No API, schema, schedule, registration submission, or team-formation code was changed.

Validation passed: `bunx vitest run tests/unit/app/domains/events/presentation.test.ts`, `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Summary:
- Added a shared registration-header presentation helper that emits max-team-members metadata only for hackathon events.
- Updated the public registration, application terms, and feedback headers to use the helper, so meetup/build pages no longer show team-size copy.
- Added unit coverage for hackathon, meetup, and build behavior.

Validation:
- `bunx vitest run tests/unit/app/domains/events/presentation.test.ts`
- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`

Risks and follow-ups:
- No known follow-ups. This is a presentation-only change and does not alter APIs, schemas, registration submission, or team formation behavior.
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
