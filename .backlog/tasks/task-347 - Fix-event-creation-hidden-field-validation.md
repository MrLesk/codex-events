---
id: TASK-347
title: Fix event creation hidden-field validation
status: Done
assignee:
  - Codex
created_date: '2026-05-31 18:38'
updated_date: '2026-05-31 18:40'
labels: []
dependencies: []
modified_files:
  - app/domains/events/admin-event.ts
  - tests/unit/app/domains/events/admin-event-schema.test.ts
priority: medium
ordinal: 50000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Creating an event draft should not be blocked by hidden hackathon-only form fields. The client validation for the create/settings form should validate the fields relevant to the selected event type and avoid generic hidden-field "Invalid input" failures before the create request is sent.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Creating a Meetup or Build draft is not blocked by stale or blank hidden hackathon-only fields such as tracks, judging settings, team size, or submission requirements.
- [x] #2 Creating a Hackathon draft still validates visible hackathon-specific fields and schedule constraints.
- [x] #3 The create/settings form no longer surfaces generic hidden-field validation failures for event-type-specific fields.
- [x] #4 Relevant unit coverage verifies non-hackathon validation ignores hidden hackathon-only invalid values while hackathon validation remains strict.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Normalize non-hackathon create/settings form validation input in `app/domains/events/admin-event.ts` so hidden hackathon-only fields cannot fail client validation when the selected event type is Meetup or Build.
2. Keep hackathon validation strict for visible hackathon fields, especially submission timing, team size, judging settings, and tracks.
3. Add focused schema tests in `tests/unit/app/domains/events/admin-event-schema.test.ts` for non-hackathon hidden invalid values and hackathon strictness.
4. Run the targeted schema test, then `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented event-type-aware client validation by normalizing hidden hackathon-only fields before the create/settings schema runs for Meetup and Build events. Canonical docs, config, workflow docs, auth, and permissions are unchanged because this only changes client-side form validation scope. Validation passed: targeted `bunx vitest run tests/unit/app/domains/events/admin-event-schema.test.ts`, direct vee-validate parse check for a Meetup with invalid hidden hackathon fields, `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Summary:
- Added event-type-aware normalization before the create/settings form schema validates values.
- Hidden hackathon-only fields such as tracks, submission dates, team size, judging settings, and submission requirements are normalized for Meetup and Build validation.
- Kept Hackathon validation strict and added tests covering both non-hackathon hidden-field normalization and invalid Hackathon tracks.

Validation:
- `bunx vitest run tests/unit/app/domains/events/admin-event-schema.test.ts`
- direct vee-validate parse check for a Meetup with invalid hidden hackathon values
- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`

Risks and follow-ups:
- No known follow-ups. The API payload and server validation are unchanged; this only prevents hidden event-type-specific client fields from blocking create/settings submit.
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
