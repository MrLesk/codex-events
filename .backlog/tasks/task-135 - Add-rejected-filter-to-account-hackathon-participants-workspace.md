---
id: TASK-135
title: Add rejected filter to account hackathon participants workspace
status: Done
assignee:
  - codex
created_date: '2026-03-31 18:52'
updated_date: '2026-03-31 18:57'
labels:
  - ui
  - account
  - hackathons
dependencies: []
references:
  - >-
    /Users/alex/projects/codex-hackathons/app/components/account/hackathons/AccountHackathonAdminOperationsPanel.vue
  - >-
    /Users/alex/projects/codex-hackathons/app/components/account/hackathons/AccountHackathonParticipantVisibilityPanel.vue
  - >-
    /Users/alex/projects/codex-hackathons/app/components/admin/AdminApplicationsReviewPanel.vue
  - /Users/alex/projects/codex-hackathons/app/utils/admin-application-review.ts
  - >-
    /Users/alex/projects/codex-hackathons/tests/unit/app/utils/admin-application-review.test.ts
documentation:
  - /Users/alex/projects/codex-hackathons/docs/README.md
  - /Users/alex/projects/codex-hackathons/docs/domain-model.md
  - /Users/alex/projects/codex-hackathons/docs/permissions-matrix.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a Rejected filter to the Participants tab in the account hackathon workspace so actors with participant-visibility access can browse rejected participant application records directly from the existing participant review surface. This should extend the current Applications and Approved filter model without introducing a separate workflow. The change applies to the admin participants workspace and the read-only participant-visibility workspace that both render under the same account hackathon Participants tab. Canonical docs were reviewed and remain unchanged because this is a UI-only visibility refinement within the existing application status model.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The account hackathon Participants tab exposes a Rejected filter alongside Applications and Approved in both the admin workspace and the read-only participant-visibility workspace.
- [x] #2 Selecting Rejected shows only participant application records with status rejected and updates the filtered total label accordingly.
- [x] #3 The shared participant review panel uses rejected-specific section copy and empty-state copy instead of reusing the applications or approved messaging.
- [x] #4 Relevant unit coverage is updated for the rejected participant review filter behavior and any shared view logic touched by the change.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend the shared participant review view model in `app/utils/admin-application-review.ts` so filtering supports `rejected` alongside `applications` and `approved`.
2. Update both account participant workspace shells in `app/components/account/hackathons/AccountHackathonAdminOperationsPanel.vue` and `app/components/account/hackathons/AccountHackathonParticipantVisibilityPanel.vue` to add a `Rejected` tab and rejected-specific filtered count label.
3. Update `app/components/admin/AdminApplicationsReviewPanel.vue` to use rejected-specific title, description, and empty-state copy while preserving the existing action-only behavior for submitted applications.
4. Add unit coverage for the rejected filter behavior in `tests/unit/app/utils/admin-application-review.test.ts`.
5. Run `bun run lint`, `bun run typecheck`, and `bun run test:unit` before handoff.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Discovery completed before implementation. Existing Participants tab logic already counts rejected applications, but the shared participant review view model currently exposes only `applications` and `approved`, so the rejected view needs to be added consistently across both account workspace participant surfaces and the shared review panel.

User approved proceeding with the recommended scope: add the Rejected participant filter to both the admin Participants workspace and the read-only participant-visibility workspace on the account hackathon page.

Implemented the rejected participant review path by extending the shared `AdminApplicationReviewView` filter model, adding a `Rejected` tab to both account hackathon participant workspace shells, and updating the shared review panel copy and badge treatment for rejected records.

Validation: `bun run lint` passed with the existing repository `vue/no-v-html` warnings in legal and registration pages, `bun run typecheck` passed, and `bun run test:unit` passed. There are still no dedicated Vue component-mount tests for these panels in this repository, so coverage was added at the shared participant review utility layer instead.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Extended the account hackathon Participants workspace to support a third `Rejected` filter alongside `Applications` and `Approved` in both the admin operations panel and the read-only participant-visibility panel. The shared participant review view model now filters rejected application records, the workspace filter-total labels reflect rejected counts, and the review card uses rejected-specific title, description, empty-state copy, and status badge treatment so rejected participants are clearly identifiable from the existing participant review surface.

Updated unit coverage in `tests/unit/app/utils/admin-application-review.test.ts` to verify rejected filtering keeps teammate hints scoped to the visible rejected applicants. Validation passed with `bun run lint`, `bun run typecheck`, and `bun run test:unit`; lint still reports the existing `vue/no-v-html` warnings in unrelated legal and registration pages.
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
