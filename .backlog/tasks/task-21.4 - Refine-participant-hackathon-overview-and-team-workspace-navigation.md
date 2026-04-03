---
id: TASK-21.4
title: Refine participant hackathon overview and team workspace navigation
status: Done
assignee: []
created_date: '2026-04-03 19:00'
updated_date: '2026-04-03 19:56'
labels:
  - participant
  - account-workspace
  - team-workspace
  - ui
dependencies: []
documentation:
  - /Users/alex/projects/codex-hackathons/docs/domain-model.md
  - /Users/alex/projects/codex-hackathons/docs/lifecycle-and-state-machines.md
  - /Users/alex/projects/codex-hackathons/docs/permissions-matrix.md
parent_task_id: TASK-21
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Adjust the participant-facing account hackathon flow so the dashboard always opens the hackathon Overview tab first, then make the Overview tab prioritize approval state and the next participant actions before team formation begins. Approved participants should continue to see the approval chip in the header, keep the approval banner visible in Overview until submission opens, get explicit calls to open the Team tab and Details tab, and see the full address in participant-visible event details. The Team tab should stop using the off-pattern custom create-team form styling and instead follow the shared form presentation used elsewhere in the product.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The participant hackathon card on /account always links to the account hackathon overview rather than sending approved users directly to the Team tab
- [x] #2 In the account hackathon Overview tab, approval status is the primary participant message during registration and non-approved states continue to show until the hackathon ends
- [x] #3 Approved participants keep the approval chip in the workspace header and keep the approval banner visible in Overview only until the hackathon enters submission_open or later
- [x] #4 Approved participants see clear overview actions to open the Team tab and the Details tab before submission starts
- [x] #5 Participant-visible hackathon details expose the address for approved participants without changing admin-only behavior
- [x] #6 The participant Team tab uses the shared platform form style for create-team fields instead of the current bespoke form presentation
- [x] #7 Tests are updated for the changed participant navigation or status helper behavior, and any remaining UI automation gap is documented in the task notes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the account hackathon card CTA so participant entries always open the overview workspace first.
2. Refine the participant overview section to keep approval state primary during registration, add approved-user action banners, and reduce duplicate status messaging after submission opens.
3. Expose participant-visible address detail for approved users in the details experience without changing admin-only behavior.
4. Replace the custom create-team form markup with the shared platform form primitives and align the surrounding panel presentation with existing participant-facing forms.
5. Update focused unit tests for navigation/status helpers, document any remaining UI automation gap, and run lint, typecheck, and unit tests.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-04-03: The off-pattern participant create-team form is hand-rolled in app/components/teams/ParticipantTeamDirectoryPanel.vue. Closest duplicate form styling remains in app/components/teams/ParticipantTeamWorkspacePanel.vue; other near-matches exist in participant submission, profile, and judging forms but were left unchanged for this scoped fix.

2026-04-03: Added focused unit coverage for the overview-banner visibility rule and the account participation-card primary action. There is still no direct UI automation for the live /account landing CTA or the participant overview banner rendering; that gap remains documented rather than implied away.

Reworked participant-facing overview and Team tab copy to remove internal 'workspace' phrasing. Approved users now see participant-first next-step panels in overview, positive actions appear before withdrawal, and the Team tab summary card now reflects the participant's actual state (form team, continue with team, pending approval, not approved, withdrawn).

Removed participant-controlled team slugs from create-team and rename-team flows. The participant UI no longer shows editable slug inputs, and the server now derives a sanitized unique slug from the submitted team name on both create and rename routes. Added route coverage for automatic slug generation and collision suffixing.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated the participant account hackathon flow so dashboard cards always open the overview workspace first, approval state remains the primary overview signal during registration, and approved participants get clearer next-step actions before submissions open. The overview now keeps the approval chip in the header, shows approved-only team/details actions before submission opens, exposes the event address in participant-visible details, and uses participant-facing copy rather than internal workspace wording.

Aligned the Team tab with shared platform form presentation and removed participant-controlled slug entry from team create and rename flows. Team slugs are now generated server-side from the submitted team name, including collision-safe numeric suffixing, and the participant UI no longer exposes editable slug fields.

Validation: `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/team-formation-routes.test.ts` all passed. Remaining gap: there is still no direct UI automation for the `/account` landing CTA or the overview banner rendering, so that behavior remains covered by helper tests and documented task notes rather than end-to-end coverage.
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
