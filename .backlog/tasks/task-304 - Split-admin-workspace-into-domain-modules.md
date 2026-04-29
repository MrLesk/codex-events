---
id: TASK-304
title: Split admin workspace into domain modules
status: Done
assignee:
  - codex
created_date: '2026-04-29 21:34'
updated_date: '2026-04-29 22:33'
labels:
  - architecture
  - client
  - domain-cleanup
dependencies: []
references:
  - app/utils/admin-workspace.ts
  - app/composables/useAdminWorkspace.ts
  - app/utils/form-schemas.ts
  - app/domains
documentation:
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/permissions-matrix.md
  - docs/testing-strategy.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refactor the client admin workspace architecture so admin-facing contracts, policies, form state, dashboard helpers, judging helpers, and outcome records live with their product domains instead of the broad app/utils/admin-workspace.ts module. Preserve behavior while replacing the central utility import surface with domain-owned modules and screen/use-case composables.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Admin-facing session, access, hackathon configuration, lifecycle, application review, submission operations, judging, and outcome helpers are owned by domain modules rather than app/utils/admin-workspace.ts.
- [x] #2 Hackathon configuration form schema is colocated with the hackathon admin form state/mapping boundary instead of the generic app/utils/form-schemas.ts utility module.
- [x] #3 Admin workspace data loading is split into use-case composables so screens no longer depend on one many-flag useAdminWorkspace loader.
- [x] #4 Existing admin, account-scoped hackathon, public hackathon, judge, and prize redemption screens keep their current behavior while importing from the new domain boundaries.
- [x] #5 The old app/utils/admin-workspace.ts module is removed once all call sites and tests use domain modules directly.
- [x] #6 Relevant unit tests are moved or updated to cover the new modules, and bun run lint, bun run typecheck, and bun run test:unit pass locally.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Merged implementation plan:
1. Move foundational actor/session contracts to app/domains/accounts/session-actor.ts and hackathon role/access policy to app/domains/hackathons/access.ts. Update direct imports and split access tests out of admin-workspace.test.ts.
2. Move hackathon admin contracts, form state, form mappers, slug/date helpers, state labels/colors/progress, terms helper, and hackathonConfigFormSchema into app/domains/hackathons/admin-hackathon.ts. Update config form/page imports and form-schema tests.
3. Move lifecycle metrics/control policy into app/domains/hackathons/lifecycle-controls.ts and update operations/header usage and tests.
4. Move application record/attendance/Luma/participant-limit helpers into app/domains/applications/admin-application-record.ts, leaving the existing admin-application-review.ts fuzzy/grouping module intact.
5. Move team admin records to app/domains/teams/admin-team-record.ts, submission admin records to app/domains/submissions/admin-submission-record.ts, and cross-domain operations dashboard helpers/intervention policy to app/domains/submissions/admin-operations.ts.
6. Move judging oversight helpers to app/domains/judging/admin-oversight.ts and criteria configuration validation to app/domains/judging/criteria-config.ts.
7. Move outcome record contracts to app/domains/outcomes/admin-outcomes.ts.
8. Replace the many-flag admin hackathon loader with use-case composables in app/composables/useAdminWorkspace.ts or adjacent composables, then update screens to depend on the use-case APIs they actually need.
9. Delete app/utils/admin-workspace.ts after all call sites and tests import domain modules directly.
10. Run bun run lint, bun run typecheck, and bun run test:unit; update TASK-304 acceptance criteria and final summary before handoff.

Post-review architecture cleanup: unify the client session actor type with the existing useSessionActor contract, pass account-scoped hackathon ids directly into admin settings/operations panels to avoid duplicate slug resolution, split public winner/published-project DTOs out of admin outcome records, and move the shared submission project label helper out of the operations dashboard module. Leave broader shared server/client enum consolidation out of this pass because it crosses runtime/package boundaries and should be handled deliberately.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Final architecture pass moved remaining domain-owned client helpers out of app/utils, moved neutral hackathon record/state contracts out of admin-hackathon, moved route/navigation helpers into account domain modules, and moved shared contracts under shared/domains. Canonical product docs were confirmed unchanged because this is an internal architecture refactor with no product rule change.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Split the admin workspace and related client helpers into domain-owned modules. Removed app/utils/admin-workspace.ts and app/utils/form-schemas.ts, split admin workspace loading into settings/operations use-case composables, moved hackathon records/state helpers into neutral hackathon modules, moved account route/session helpers into account domain modules, and moved shared contracts under shared/domains. Validation passed locally: bun run lint, bun run typecheck, and bun run test:unit.
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
