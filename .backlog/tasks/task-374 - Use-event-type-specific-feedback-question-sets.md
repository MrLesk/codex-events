---
id: TASK-374
title: Use event-type-specific feedback question sets
status: Done
assignee:
  - '@codex'
created_date: '2026-06-04 19:56'
updated_date: '2026-06-04 20:12'
labels:
  - feedback
  - events
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/schema-outline.md
  - docs/api-surface.md
  - docs/permissions-matrix.md
  - docs/testing-strategy.md
modified_files:
  - shared/domains/events/feedback.ts
  - app/components/public/events/EventFeedbackForm.vue
  - 'app/pages/events/[slug]/feedback.vue'
  - server/domains/events/feedback.ts
  - 'server/api/public/events/[slug]/feedback.post.ts'
  - 'server/api/events/[eventId]/feedback/index.get.ts'
  - docs/domain-model.md
  - docs/schema-outline.md
  - docs/api-surface.md
  - tests/unit/server/domains/events/feedback.test.ts
  - tests/integration/server/api/event-routes.test.ts
priority: high
ordinal: 70000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make post-event feedback questions match the event type. Hackathon feedback should keep the current competition-oriented topics, while Meetup and Build events should show participant-facing questions that fit registration-only event experiences instead of team formation, judging, or competition-specific language. Keep the current anonymous submission, completed-event availability, and internal reporting behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Public feedback forms select their visible question wording from the event type, with Hackathon retaining competition-oriented questions and Meetup/Build using non-competition wording.
- [x] #2 Feedback submissions and summaries use the event-type question set consistently while keeping the existing rating fields, anonymous storage, completed-event availability, Not applicable handling, and reporting calculations.
- [x] #3 Canonical docs describe event-type-specific feedback topics without implying per-event custom question builders.
- [x] #4 Relevant unit and integration tests cover event-type-specific question selection, submission parsing, and result summaries.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the shared feedback domain to expose question definitions by event type while preserving the existing stable feedback field IDs and storage fields.
2. Pass the public event type into the public feedback form and use it to render the appropriate question wording and payload keys.
3. Make server-side feedback validation and summary generation resolve question definitions from the target event type, keeping the current anonymous storage, completed-state gate, rate limiting, nullable Not applicable semantics, and average/count calculations.
4. Update canonical docs to describe event-type-specific feedback topics without introducing per-event custom questions.
5. Add or update focused unit and integration coverage, then run `bun run lint`, `bun run typecheck`, `bun run test:unit`, and targeted integration coverage for the touched feedback routes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented event-type-specific feedback question sets using stable feedback field IDs and platform-defined wording for Hackathon, Meetup, and Build events. Public feedback forms now receive the event type and render the matching question set; internal feedback summaries resolve question labels/prompts from the event record so reports match what participants saw. No database migration was required because the existing rating fields remain the storage contract.

Validation: `bun run lint`, `bun run typecheck`, `bun run test:unit`, `bun run test:integration`, targeted `bun run test:unit -- --run tests/unit/server/domains/events/feedback.test.ts`, and targeted `bun run test:integration -- --run tests/integration/server/api/event-routes.test.ts` passed. `bun run test:bdd` was attempted twice and failed before scenarios because the local Nuxt dev server hit a Vite IPC socket `connect EINVAL` under the macOS `/var/folders/...` temp path. Retrying as `TMPDIR=/tmp bun run test:bdd` got past server startup but failed in unrelated authenticated BDD setup: 20 authenticated scenarios failed, mostly because saved Auth0 session-state files were missing; public BDD scenarios that ran passed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added platform-defined feedback question sets by event type while keeping the existing anonymous feedback storage and reporting mechanics. Hackathon events keep the current competition-oriented questions, Meetup events now ask about meetup content/networking/session experience, and Build events now ask about builder community, guidance, support, and progress instead of judging/team-formation concepts.

The public feedback form receives `eventType` from the public event payload and renders the matching question set. Internal feedback summaries now load the event record and return question labels/prompts for that event type, so account workspace reporting matches the participant-facing form. Canonical docs now describe fixed event-type feedback defaults and make clear this is not per-event custom question configuration.

Coverage added for event-type question selection and build-event summary wording. Validation passed for lint, typecheck, unit, integration, and targeted feedback tests. BDD was attempted but could not be completed in this environment: the exact command failed at local Nuxt startup due a Vite IPC socket `connect EINVAL`; with `TMPDIR=/tmp`, startup succeeded but unrelated authenticated session-state fixture failures stopped the suite.
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
