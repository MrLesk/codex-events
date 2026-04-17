---
id: TASK-229
title: Refine admin interventions UX in the account hackathon submissions tab
status: Done
assignee:
  - '@codex'
created_date: '2026-04-17 08:07'
updated_date: '2026-04-17 08:11'
labels:
  - admin
  - ui
  - submissions
  - ux
dependencies: []
references:
  - app/components/account/hackathons/AccountHackathonAdminOperationsPanel.vue
  - app/components/admin/AdminTeamsOperationsPanel.vue
  - app/components/admin/AdminSubmissionInterventionsPanel.vue
  - app/components/admin/AdminApplicationsReviewPanel.vue
  - app/utils/admin-workspace.ts
documentation:
  - docs/README.md
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/permissions-matrix.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the admin-only submissions tab on `/account/hackathons/:slug?tab=submissions` so admin interventions no longer consume a dedicated sidebar column. Rework the interventions surface into a compact collapsible section at the top of the submissions page, modeled on the collapsible admin alerts already used in the participants tab. Also expose admin-withdrawal directly from each eligible team row in the merged team/submission list so admins can expand the existing requester-plus-note form inline where they are already reviewing that team.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The submissions tab no longer renders admin interventions in a dedicated sidebar column and instead shows a compact collapsible interventions surface above the main team list.
- [x] #2 The collapsible interventions surface follows the existing account admin alert interaction pattern and preserves the canonical intervention guidance and available intervention actions.
- [x] #3 Each team row that is eligible for admin withdrawal exposes an inline withdraw action that expands into the requester-selection, operational-note, and confirmation flow for that team.
- [x] #4 Team rows that are not eligible for admin withdrawal do not show the inline withdraw action, and existing admin intervention guards remain unchanged.
- [x] #5 Relevant automated coverage is updated for the revised interventions UX and required local validation is run, with any unrelated pre-existing validation blockers called out explicitly.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Replace the submissions tab two-column layout with a single-column stack in `app/components/account/hackathons/AccountHackathonAdminOperationsPanel.vue`, placing admin interventions above the main team list.
2. Rework `app/components/admin/AdminSubmissionInterventionsPanel.vue` into a compact collapsible alert using the same interaction pattern as the participants-tab Luma sync alert, keeping admin guidance and disqualification actions there while avoiding duplicate withdraw forms.
3. Add an inline admin-withdraw expansion flow to eligible team rows in `app/components/admin/AdminTeamsOperationsPanel.vue`, reusing the existing requester-selection and operational-note requirements before confirming the action.
4. Update relevant test coverage and rerun `bun run lint`, `bun run typecheck`, and `bun run test:unit`, documenting the known unrelated lint blocker if it still exists.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Reworked the submissions tab into a single-column flow so admin interventions no longer occupy a persistent sidebar. The top-level interventions surface now uses the same collapsible alert interaction pattern as the participants-tab Luma sync alert.

Moved admin-withdraw into each eligible team row in `AdminTeamsOperationsPanel.vue`, reusing the existing requester-selection and operational-note requirements with inline expand/collapse controls and the same mutation payload.

Kept disqualification in the new top interventions alert so the page avoids duplicating withdraw forms while still preserving admin-only guidance and the remaining lifecycle-gated intervention action.

Updated the admin BDD step selectors for withdraw and disqualify to drive the revised UI. Validation results: `bun run typecheck` passed and `bun run test:unit` passed. `bun run lint` remains blocked by the unrelated existing `@typescript-eslint/no-explicit-any` error in `app/utils/hackathon-credits.ts:63`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Refined the admin interventions UX on the account hackathon submissions tab so interventions no longer take a dedicated sidebar column. The submissions page now stacks a compact collapsible `Admin interventions` alert above the team list, following the same interaction pattern as the participants-tab Luma sync alert. That top surface keeps the intervention rules visible and retains the disqualification workflow for locked submissions without consuming persistent horizontal space.

Moved admin-withdraw into the main team list where admins are already reviewing each team. Eligible rows now expose a `Withdraw` action that expands inline into the existing requester-selection and operational-note form, followed by a confirm button to withdraw the submission. Teams that are not eligible do not show the action, and the underlying lifecycle guards and mutation payloads remain unchanged.

Updated the BDD admin-operation step selectors to match the revised withdraw/disqualify entry points. Validation: `bun run typecheck` passed and `bun run test:unit` passed. `bun run lint` still fails because of the unrelated existing `@typescript-eslint/no-explicit-any` error in `app/utils/hackathon-credits.ts:63`, which is outside the scope of TASK-229.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [ ] #3 Relevant validation commands pass
- [x] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [x] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
