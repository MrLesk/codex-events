---
id: TASK-394
title: Fix staff participant visibility pagination
status: Done
assignee: []
created_date: '2026-06-13 20:43'
updated_date: '2026-06-13 20:48'
labels:
  - bug
  - staff
  - participants
dependencies: []
documentation:
  - docs/permissions-matrix.md
  - docs/domain-model.md
modified_files:
  - app/components/account/events/AccountEventParticipantVisibilityPanel.vue
  - tests/integration/server/api/application-routes.test.ts
priority: medium
ordinal: 73000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Staff users with participant visibility access must see the complete participant set for supported events, not just the first default application page. This fixes the account event Participants tab for staff on events with more than one page of applications.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Staff participant visibility loads all application pages for the event.
- [x] #2 Staff counts and participant status tabs reflect submitted, approved, rejected, and withdrawn applications across the full event participant set.
- [x] #3 The staff participant view remains read-only and does not grant review mutation actions.
- [x] #4 Required validation passes for the code change.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Confirm canonical permission rules for staff participant visibility in docs.
2. Compare the staff participant visibility loader with the admin participant loader.
3. Update the staff visibility panel to load all application pages for the event using the shared pagination helper while preserving read-only rendering.
4. Add regression coverage for staff access to paginated mixed-status application lists.
5. Run required validation: lint, typecheck, unit tests, integration tests, and BDD tests.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Root cause: `AccountEventParticipantVisibilityPanel` used a single default `/applications` fetch, so staff only received the first 20 application records. Admin operations already used `listAllPaginatedItems`, which is why event admins could see the complete participant set.

Validation passed after the final code and test changes: `bun run lint`, `bun run typecheck`, `bun run test:unit`, `bun run test:integration`, and `bun run test:bdd`. A targeted `bun vitest run --config vitest.integration.config.ts tests/integration/server/api/application-routes.test.ts` also passed. One BDD attempt failed during Auth0 bootstrap before app tests ran; rerunning passed completely.

Component-specific automation note: this repo does not currently have Vue component unit tests. Regression coverage was added at the staff application pagination API layer, and the full BDD suite was rerun for account workspace coverage.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed the staff participant visibility regression by changing `AccountEventParticipantVisibilityPanel` to load every application page with the shared `listAllPaginatedItems` helper instead of relying on the default first page of `/applications`. This preserves the read-only staff participant panel while letting staff counts and tabs reflect all submitted, approved, rejected, and withdrawn participants.

Added an integration regression showing a staff user can page through a mixed-status participant list where the first page contains only submitted applications and later pages contain reviewed/withdrawn participants.

Validation: `bun run lint`, `bun run typecheck`, `bun run test:unit`, `bun run test:integration`, and `bun run test:bdd` passed. The first BDD rerun hit an Auth0 bootstrap-only failure before app tests executed; the retry passed fully.
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
