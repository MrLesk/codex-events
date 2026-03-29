---
id: TASK-98
title: Restructure participant review rows and preserve scroll on staged decisions
status: Done
assignee: []
created_date: '2026-03-29 17:49'
updated_date: '2026-03-29 17:52'
labels:
  - ui
  - admin
  - hackathons
dependencies: []
references:
  - >-
    /Users/alex/projects/codex-hackathons/app/components/admin/AdminApplicationsReviewPanel.vue
  - >-
    /Users/alex/projects/codex-hackathons/app/components/account/hackathons/AccountHackathonAdminOperationsPanel.vue
  - >-
    /Users/alex/projects/codex-hackathons/app/components/admin/HackathonConfigForm.vue
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refine the admin Participants review experience so reviewers can stage decisions without losing their place in long lists and can act on likely-team groups with clearer controls. Rework the participant group card to remove the nested inner card treatment, adopt a two-column content-and-controls layout inspired by the agenda editor rows, and add an explicit group approval affordance for likely teams.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Staging an approval or rejection from the Participants Applications view keeps the reviewer near the same scroll position after the data refresh completes.
- [x] #2 Participant review groups use a single outer card with divider-separated participant rows instead of nested cards inside a group card.
- [x] #3 Each submitted participant row presents a dedicated controls column with clear staged-decision highlighting, and likely-team groups expose an Approve Team action.
- [x] #4 Approved Participants view stays read-only and does not show application decision controls.
- [x] #5 Local validation passes after the participant review UI changes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Canonical docs were confirmed unchanged for this UI-only participant review refinement.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Restructured the Participants Applications review surface into a single-card group layout with divider-separated participant rows and a dedicated right-side controls column inspired by the agenda editor rows. Replaced the old nested action buttons with transparent decision controls that highlight the staged state, added an Approve Team action that stages approvals for all visible submitted participants in the group through one refresh cycle, and kept the Approved Participants view read-only. Updated the shared mutation runner to restore scroll position after admin mutations so reviewers keep their place after staging decisions. Risks/follow-up: because staged approval state is stored per application and not with an action source, a fully approved multi-person visible group highlights the group-level Approve Team control even if those approvals were staged individually.

Validation passed with `bun run test:unit` and `bun run typecheck`.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [x] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
