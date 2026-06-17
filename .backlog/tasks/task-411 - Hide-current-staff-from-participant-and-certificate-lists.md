---
id: TASK-411
title: Hide current staff from participant and certificate lists
status: Done
assignee:
  - '@codex'
created_date: '2026-06-17 19:44'
updated_date: '2026-06-17 19:55'
labels:
  - frontend
  - participants
  - certificates
dependencies: []
modified_files:
  - app/components/account/events/AccountEventCertificatesPanel.vue
  - app/components/account/events/AccountEventParticipantsPanel.vue
  - app/domains/applications/admin-application-record.ts
  - docs/api-surface.md
  - docs/domain-model.md
  - server/domains/applications/index.ts
  - tests/integration/server/api/application-routes.test.ts
  - tests/unit/app/domains/admin-domain-modules.test.ts
priority: medium
ordinal: 90000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Current staff should not appear in participant roster-style views or the admin Certificates tab while their event staff designation is active. The underlying approved application remains unchanged so removing staff designation makes the person appear again as a participant.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Participant roster-style account views exclude applications whose user currently has staff designation for the same event.
- [x] #2 The admin Certificates tab excludes currently staff-designated users from rows, counts, search, and attendance filters without revoking or mutating certificates.
- [x] #3 Removing a user's staff designation makes their existing application visible again through the same participant and certificate surfaces.
- [x] #4 Regression coverage confirms the current staff-derived flag and the frontend filters.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a derived current-staff flag to event application serialization using the existing event role assignment model.
2. Filter participant and certificate account workspace surfaces from that derived flag while preserving underlying application data.
3. Add focused integration/unit coverage for staff flag derivation and the UI-facing filter behavior.
4. Run required validation and finalize TASK-411.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented a current-role derived isEventStaff flag on event application list responses and reused a shared participant-roster filter in the participant and certificate account workspace panels. The underlying application and certificate state is unchanged, so removing staff designation makes the application visible again. Validation passed: git diff --check, bun run lint, bun run typecheck, bun run test:unit, bun run test:integration, bun run test:bdd.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Current staff-designated users are omitted from account participant roster and certificate-management lists while their applications remain intact. Added API, domain, docs, and regression coverage for the current staff flag and fallback behavior after staff designation is removed. Verified with diff check, lint, typecheck, unit, integration, and BDD suites.
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
