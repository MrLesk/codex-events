---
id: TASK-21.5
title: >-
  Move participant submission management into a dedicated account hackathon
  Submission tab
status: Done
assignee:
  - '@codex'
created_date: '2026-04-12 12:10'
updated_date: '2026-04-12 12:20'
labels:
  - participant
  - account-workspace
  - submission
  - ui
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/permissions-matrix.md
parent_task_id: TASK-21
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Adjust the participant-facing account hackathon workspace so submission management no longer lives inside the Team tab. Approved participants should get a dedicated `Submission` tab in `/account/hackathons/:slug`, while non-approved actors must not see that tab. During `registration_open`, the tab should show a participant-facing card that explains the submission window is not open yet and includes the configured submission open timestamp. Once the submission window is active, the tab should reuse the existing participant submission experience (current project snapshot plus submission details/actions) that currently renders in the Team tab. Submission fields should validate like the registration form: errors surface on submit attempt, create/save actions are blocked until the form is valid, and all submission fields are mandatory. Server-side submission writes and submit actions must enforce the same canonical required-field rules so incomplete submissions cannot be created, saved, or submitted through the API.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Approved participants see a dedicated `Submission` tab in the account hackathon workspace, and non-approved actors do not.
- [x] #2 The participant Team tab no longer renders the submission section that currently appears beneath the team workspace.
- [x] #3 During `registration_open`, the participant Submission tab shows a card stating that submissions are not open yet and displays the configured submission open date and time.
- [x] #4 During `submission_open`, the participant Submission tab renders the existing project snapshot and submission details/actions experience that previously lived in the Team tab.
- [x] #5 Participant submission form validation follows the registration-form pattern: field errors appear after submit attempt, create/save are blocked when invalid, and project name, summary, repository URL, and demo URL are all required.
- [x] #6 Server-side submission create/update/submit flows reject incomplete submission data so the canonical API behavior matches the required-field UI.
- [x] #7 Tests are updated for tab visibility, participant submission validation/behavior, and any remaining automation gap is documented in the task notes.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend the participant account-hackathon tab model to add a dedicated `submission` tab for approved participants, update workspace navigation/SEO, and keep the existing admin `submissions` tab unchanged.
2. Refactor the participant team/submission workspace wiring so the Team tab stops rendering the submission panel while a dedicated participant submission surface reuses the same provisional-team and submission-workspace logic.
3. During `registration_open`, render a participant-facing closed-window card in the Submission tab that shows the configured `submissionOpensAt` timestamp; after the submission window closes, preserve the tab as a read-only submission surface.
4. Align participant submission validation with the registration form by using submit-attempt error display, required-field styling, and blocking create/save while the form is invalid.
5. Enforce the same required submission-field rules in server-side create/update/submit validation so incomplete submissions cannot be persisted or submitted through the API.
6. Update focused unit, integration, and BDD coverage for participant tab visibility, closed-window messaging, and submission validation behavior, then run `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-04-12: User approved the implementation plan and confirmed the default behavior that the participant Submission tab should remain visible as a read-only surface after `submission_open` ends.

2026-04-12: Added a participant-facing `submission` workspace tab and routed the existing participant submission surface there, while keeping the Team tab focused on team formation and membership management.

2026-04-12: Submission validation now follows the registration-form submit-attempt pattern in the participant UI, and server-side submission create/update/submit flows now require all four canonical submission fields.

2026-04-12: Validation run: `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/submission-routes.test.ts` all passed.

2026-04-12: Updated BDD coverage for the participant Submission tab route and registration-phase closed-window notice, but did not run the full BDD suite in this turn.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Moved participant submission management out of the account hackathon Team tab and into a dedicated participant Submission tab that appears only for approved users. The account workspace navigation, SEO metadata, overview CTA, and participant panel rendering now separate team management from submission management while preserving the existing read-only submission visibility after the submission window closes.

Updated the participant submission form to follow the registration-form validation pattern: field errors appear on submit attempt, create/save/submit actions validate through the form, and project name, summary, repository URL, and demo URL are all required. Added a registration-phase closed-window card that shows when submissions are unavailable and displays the configured submission open timestamp.

Aligned the server submission contract with the UI by requiring all canonical submission fields on create/update and by rejecting submit attempts for stored draft submissions that are still incomplete. Updated focused unit, integration, and BDD coverage for the new tab visibility and submission validation behavior.

Validation run:
- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`
- `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/submission-routes.test.ts`

Remaining gap:
- Full Playwright BDD suite was not run in this turn; only the feature/step coverage was updated.
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
