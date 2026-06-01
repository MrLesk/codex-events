---
id: TASK-360
title: Fix one-time approved participation notice
status: Done
assignee:
  - Codex
created_date: '2026-06-01 18:40'
updated_date: '2026-06-01 18:46'
labels:
  - bug
  - ui
dependencies: []
modified_files:
  - 'app/pages/account/events/[slug]/index.vue'
  - app/domains/applications/participant-application.ts
  - tests/unit/app/domains/applications/participant-application.test.ts
priority: medium
ordinal: 58000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Approved participation messaging in the account event overview should not appear as a persistent duplicate below the registration confirmation. The one-time approval notice should use hackathon-specific team language only for hackathon events; afterwards the header status badge is sufficient.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 After an approved application redirect, the overview shows only one success notice instead of both the registration approval notice and the approved participation banner.
- [x] #2 Hackathon events may use the approved participation wording in the one-time notice; meetup and build events do not show hackathon team-formation copy.
- [x] #3 Approved applications do not show a persistent overview status banner on later visits when the one-time notice query is absent.
- [x] #4 Unit coverage is updated for the approved overview banner visibility rule.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the account event overview one-time notice copy so approved hackathon redirects use the hackathon-specific approval message in the existing notice slot, while non-hackathon events keep generic registration approval/submission copy.
2. Stop showing approved applications as persistent overview status banners; non-approved statuses continue to use the existing banner helper.
3. Update participant application unit tests for the new approved banner visibility rule and keep docs unchanged because this is UI presentation behavior already covered by canonical event-type distinctions.
4. Run focused unit tests, then project validation required for code changes before committing.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented the approved-notice rule as a one-time notice presentation helper and changed the persistent overview status banner helper to hide approved applications. Canonical docs/config were checked conceptually and did not need changes because the existing docs already distinguish hackathon-only team workflows from registration-only event types. Validation passed: bun run lint, bun run typecheck, bun run test:unit, bun run test:integration, bun run test:bdd.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Summary:
- Moved approved first-time notice copy into a tested participant application helper so hackathon approvals use team-formation wording only in the one-time notice slot.
- Removed persistent approved overview status banners; approved state remains visible through the header badge after the first visit.
- Updated unit coverage for notice copy and approved banner visibility.

Validation:
- bun run lint
- bun run typecheck
- bun run test:unit
- bun run test:integration
- bun run test:bdd

Docs/config:
- Canonical docs and configuration are unchanged; this is a presentation behavior fix within the documented event-type model.

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
