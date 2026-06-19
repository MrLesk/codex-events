---
id: TASK-415
title: Add event slides link to participant details
status: Done
assignee:
  - '@codex'
created_date: '2026-06-19 21:41'
updated_date: '2026-06-19 21:49'
labels: []
dependencies: []
modified_files:
  - app/components/admin/EventConfigForm.vue
  - app/components/public/events/EventTimeline.vue
  - app/domains/events/admin-event.ts
  - app/domains/events/records.ts
  - 'app/pages/account/events/[slug]/index.vue'
  - app/pages/admin/events/new.vue
  - docs/api-surface.md
  - docs/domain-model.md
  - docs/permissions-matrix.md
  - docs/schema-outline.md
  - drizzle/0066_event_slides_url.sql
  - server/api/events/index.post.ts
  - server/database/schema.ts
  - server/domains/events/index.ts
  - tests/integration/server/api/event-routes.test.ts
  - tests/integration/server/database/migration.test.ts
  - tests/unit/app/domains/events/admin-event-schema.test.ts
  - tests/unit/server/database/schema.test.ts
  - tests/unit/server/domains/events/index.test.ts
ordinal: 94000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Event admins can save an optional slides link in event Details settings, and approved participants can open that link from the account event details panel when it is configured.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Event Details settings accept an optional HTTP(S) slides URL and persist it with the event.
- [x] #2 Approved participant account event details show a Slides link only when the event has a saved slides URL.
- [x] #3 Public unauthenticated event reads do not expose the slides URL unless the canonical visibility rules are updated.
- [x] #4 Validation covers the slides URL contract and participant-facing serialization.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add an optional event slides URL column, migration, server validation, create/update persistence, and account-visible serialization through the existing restricted-details helper.
2. Add the slides URL to the Details settings form and pass it into the account event details timeline without exposing it from public event reads.
3. Update canonical docs and focused tests for schema, validation, serialization, and visibility.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented slidesUrl as a restricted event detail following the existing Discord/address visibility path. Validation passed: bun run lint; bun run typecheck; bun run test:unit; bun run test:integration; bun run test:bdd; git diff --check.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added an optional event slides URL in Details settings, persisted it on events, exposed it only in account-scoped event details for approved participants and privileged event roles, and kept public event reads from exposing it. Updated canonical docs and tests for validation, migrations, create/update persistence, and visibility.
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
