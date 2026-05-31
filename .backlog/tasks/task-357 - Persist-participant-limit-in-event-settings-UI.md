---
id: TASK-357
title: Persist participant limit in event settings UI
status: Done
assignee:
  - Codex
created_date: '2026-05-31 20:59'
updated_date: '2026-05-31 21:03'
labels:
  - bug
  - events
  - admin
dependencies: []
modified_files:
  - server/domains/events/index.ts
  - tests/unit/server/domains/events/index.test.ts
  - tests/unit/app/domains/admin-domain-modules.test.ts
  - tests/integration/server/api/event-routes.test.ts
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
1. Trace the settings form submission to confirm whether the participant limit is omitted, reset to null, or not reflected after the refresh.
2. Apply the smallest fix in the existing form/workspace pattern so the saved event record updates the settings form reliably after PATCH/refresh.
3. Add or update focused tests for participant-limit mapping/submission/reload behavior, keeping the existing registration-only competition-field protections.
4. Run lint, typecheck, unit tests, integration tests, and BDD if this touches the browser workflow; document any existing blocking failure.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Root cause: updateEventBodySchema reused defaulted create schemas. With Zod, defaulted schemas still materialize defaults when wrapped in optional(), so partial PATCH requests could inject participantsLimit: null and other default values even when the client omitted those fields.

Fix: split default-free update input schemas from create-time default schemas so PATCH only contains fields actually sent by the client. Added unit coverage for omitted PATCH defaults and integration coverage that a details-only PATCH preserves an existing participant limit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed the participant limit persistence bug at the server PATCH contract. The update schema no longer reuses create-time defaults for optional update fields, preventing partial saves from silently clearing participantsLimit or applying other default configuration values. Added unit coverage proving omitted update fields stay omitted, updated form mapping coverage for non-null participant limits, and extended the event route integration test to verify a details-only PATCH preserves an existing participant limit.

Validation: bun run lint passed; bun run typecheck passed; bun run test:unit passed; bun run test:integration passed. bun run test:bdd was attempted but still fails during fixture bootstrap with an existing CHECK constraint failed: score error before browser specs run.
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
