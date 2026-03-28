---
id: TASK-65
title: Refine participant-limit guidance in admin application review
status: Done
assignee:
  - codex
created_date: '2026-03-28 22:51'
updated_date: '2026-03-28 22:55'
labels: []
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/api-surface.md
  - docs/schema-outline.md
  - docs/permissions-matrix.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Clarify and implement the hackathon participant limit as an indicative planning target in the admin application approval flow. In the admin review workspace, admins need to see how full the target is while they are still staging approval decisions, including the effect of staged approvals before Save is applied. The participant limit should remain guidance for planning and venue management rather than a hard approval cap.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Canonical docs describe the hackathon participant limit as indicative planning guidance rather than an enforced approval cap.
- [x] #2 The admin application review panel shows current fill against the participant target in a way that includes staged approval decisions before they are applied.
- [x] #3 The admin review copy makes it clear to hackathon admins how many spots remain or how far above the target the current staged decisions would place them.
- [x] #4 When no participant limit is configured, the approval flow does not introduce extra participant-limit indicator messaging.
- [x] #5 Automated tests are updated for the changed guidance or indicator behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the canonical docs to clarify that the hackathon participant limit is an indicative admin planning target rather than an enforced approval ceiling.
2. Refine the admin application review panel to calculate current approved fill plus projected fill after staged approvals, and present remaining or over-target state only when a participant limit is configured.
3. Leave the no-limit case without extra participant-limit fallback messaging.
4. Update automated tests for the changed indicator and copy, then run bun run test:unit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
User approved the plan with one constraint: do not add fallback copy for hackathons without a participant limit.

Implemented the participant-limit indicator as a utility-backed summary so the admin review panel now shows projected fill against the configured target using staged approvals before Save. The participant-limit alert now renders only when a hackathon has a configured limit, per the approved scope.

Validation: `bun test tests/unit/app/utils/admin-workspace.test.ts` and `bun run test:unit` both passed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Clarified the product meaning of `participants_limit` in the canonical docs as an indicative admin planning target rather than an enforced approval cap, and updated the admin application review panel to use that model. The panel now shows current approved fill, projected fill after the current staged decisions are saved, and whether the staged approvals would leave spots remaining, match the target exactly, or put the hackathon over target. When no participant limit is configured, the extra participant-limit alert is no longer shown.

Implemented the indicator logic in `app/utils/admin-workspace.ts` so it can be unit tested cleanly, wired the UI in `app/components/admin/AdminApplicationsReviewPanel.vue`, and added unit coverage for within-target, over-target, and no-limit cases in `tests/unit/app/utils/admin-workspace.test.ts`.

Validation run: `bun test tests/unit/app/utils/admin-workspace.test.ts`; `bun run test:unit`.

Risks/follow-up: none identified beyond normal product review of the revised admin copy in the browser.
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
