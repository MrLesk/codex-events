---
id: TASK-357
title: Persist participant limit in event settings UI
status: Done
assignee:
  - '@Codex'
created_date: '2026-05-31 20:59'
updated_date: '2026-06-03 22:36'
labels:
  - bug
  - events
  - admin
dependencies: []
modified_files:
  - app/components/admin/EventConfigForm.vue
  - app/domains/events/admin-event.ts
  - tests/unit/app/domains/events/admin-event-schema.test.ts
priority: high
ordinal: 55000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fix the event settings flow so a saved participant limit remains stored and visible after saving/reloading a registration-only event. The current symptom is that the Participants limit field stays empty after Save Configuration on the account event settings tab.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Saving a participant limit from event settings persists the value on the event record.
- [x] #2 After a successful settings save, the Participants limit input shows the saved value instead of clearing.
- [x] #3 Existing registration-only event saves do not send or require hackathon-only configuration fields.
- [x] #4 Relevant unit/integration validation covers the participant limit save and reload path.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Trace the admin event settings form save and refresh path for `participantsLimit`, starting from `EventConfigForm.vue`, `app/domains/events/admin-event.ts`, the event PATCH route, and the event read/query mapping.
2. Identify whether the saved value is omitted before persistence, written to the wrong table/column, overwritten after save, or omitted from the reloaded event payload.
3. Apply the smallest direct fix using existing domain mapping/schema patterns, without compatibility fallback behavior.
4. Add or adjust focused unit/integration coverage for save followed by reload/readback.
5. Run `bun run lint`, `bun run typecheck`, and `bun run test:unit`; run integration/BBD only if the touched path requires them by the repo validation policy.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Root cause: updateEventBodySchema reused defaulted create schemas. With Zod, defaulted schemas still materialize defaults when wrapped in optional(), so partial PATCH requests could inject participantsLimit: null and other default values even when the client omitted those fields.

Fix: split default-free update input schemas from create-time default schemas so PATCH only contains fields actually sent by the client. Added unit coverage for omitted PATCH defaults and integration coverage that a details-only PATCH preserves an existing participant limit.

Reopened after a reproduced user report: Participants limit remains visible immediately after Save but disappears after a full page refresh. This suggests the client state updates optimistically or from the save response, while reload hydration reads a null/omitted value from the persisted event source.

Current production code path was rechecked: PATCH persists `participantsLimit`, the event serializer includes it, and the slug reload endpoint returns the persisted value. Added integration coverage for the exact save-then-refresh read path through `GET /api/events/slug/:slug`. Attempting to start the app against the existing `.wrangler/state` failed before Nuxt boot because migration `0052_optional_application_terms.sql` hits pre-existing foreign-key violations in the local D1 state, mostly rows pointing at missing users. A clean temporary D1 state boots successfully, so that local state issue is separate from the participant-limit persistence path.

Production diagnosis on 2026-06-03: Wrangler tail showed PATCH /api/events/:id returning 200 from the settings page, while a read-only production D1 query showed participants_limit remained null and updated_at advanced to the save time. This indicates the settings save succeeds but submits the stale/null participant limit from client form state.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed the remaining participant-limit persistence issue in the settings UI. Production diagnosis showed PATCH requests returning 200 while D1 kept `participants_limit` null, so the server path was healthy and the client was submitting stale/null form state. The participant-limit field now parses the native input event directly into `form.participantsLimit`, and the nullable input parser is covered by unit tests.

Validation: `bun run lint` passed; `bun run typecheck` passed; `bun run test:unit` passed; `bun run test:integration` passed; `bun run test:bdd` passed.
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
