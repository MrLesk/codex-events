---
id: TASK-21.6
title: >-
  Simplify participant submission panel to use the form as the only
  current-state surface
status: Done
assignee:
  - '@codex'
created_date: '2026-04-12 12:37'
updated_date: '2026-04-12 12:38'
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
Refine the participant Submission tab UI so it never shows a separate read-only snapshot section above the form. The form should always be the single place where current submission information is shown. When a submission exists, its current values should populate the form fields directly. When the submission is no longer editable because the submission window is closed or the status is locked/withdrawn/disqualified, the same fields should remain visible in read-only mode and the relevant action buttons should be disabled. Server-side submission edit protections must remain strict so closed-window or immutable-state edits are rejected even if the client is bypassed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The participant submission panel never renders a separate current-project snapshot section above the form.
- [x] #2 When a submission exists, the form fields are prefilled with the current submission values and serve as the only current-state display.
- [x] #3 When the submission is not editable, the same form remains visible in read-only mode and edit actions are disabled.
- [x] #4 Server-side submission edit protections continue rejecting edits outside mutable states or outside `submission_open`.
- [x] #5 Required validation commands pass after the UI refinement.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Remove the participant submission panel's separate current-project snapshot section so the form is always the only current-state surface.
2. Keep the existing form prefill wiring and adjust the panel copy/layout so mutable and read-only states both use the same fields.
3. Preserve and verify the existing server-side edit guards for non-mutable states and non-`submission_open` lifecycle states.
4. Run `bun run lint`, `bun run typecheck`, and `bun run test:unit` after the UI refinement.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-04-12: User clarified that the submission form should always be the only current-state surface. No separate snapshot section should appear in any state; after submission closes, fields should remain visible in read-only mode and server-side edit protections must stay strict.

2026-04-12: Removed the separate current-project snapshot section from the participant submission panel so the form is always the only current-state surface. Existing form-prefill and read-only wiring already covered mutable and immutable states without additional state changes.

2026-04-12: Validation run: `bun run lint`, `bun run typecheck`, and `bun run test:unit` all passed. No focused test changes were needed because this refinement removed duplicate presentation without changing submission state logic or API contracts.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Simplified the participant Submission tab so the form is always the only current-state surface. The separate read-only snapshot card above the form was removed, and the existing prefilled form fields now serve as both the editable and read-only display of the current submission values.

Kept the existing read-only behavior for non-editable states and preserved the server-side guardrails that already reject edits outside mutable states or outside `submission_open`. Also trimmed the helper copy in the form section to avoid explaining duplicate concepts.

Validation run:
- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`
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
