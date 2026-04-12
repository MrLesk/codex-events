---
id: TASK-42
title: Switch registration form to submit-attempt validation display
status: Done
assignee: []
created_date: '2026-03-27 19:11'
updated_date: '2026-04-12 14:08'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Show field-level validation errors only after the user attempts to submit. Keep submit button enabled for invalid form state, but block submission until the form is valid.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Registration field errors are hidden on initial render.
- [x] #2 Clicking submit with invalid form reveals field-level errors and prevents submission.
- [x] #3 Submit button is not disabled due to validation errors alone.
- [x] #4 Form still prevents submission while an existing request is pending.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Hide registration field errors on initial render and only surface them after a submit attempt.
2. Keep the submit button enabled unless a request is already pending, but block invalid submissions and reveal the relevant field errors on submit.
3. Update tests around the submit-attempt validation flow and rerun local validation.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Fixed stale client-side validation errors in registration form by validating `setValues` updates after the first submit attempt (`submitCount > 0`) so field errors now clear as soon as inputs become valid.

Validation run: `bun run typecheck` and `bun run test:unit` both pass.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated the registration form to use submit-attempt-driven validation display. Field-level validation errors are now hidden on initial render, appear when the user tries to submit an invalid form, and clear correctly as the user fixes inputs after that first attempt.

The submit button is no longer disabled just because the form is currently invalid, but submission is still blocked until the payload is valid. Pending-request protection remains in place, so the form still prevents duplicate submits while an existing request is running.

Canonical docs remain unchanged. Validation run: `bun run typecheck` and `bun run test:unit` passed. Risk/follow-up: none beyond normal registration-flow regression checks if the form logic changes again.
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
