---
id: TASK-202
title: Fix criteria validation feedback in account hackathon settings
status: Done
assignee: []
created_date: '2026-04-12 19:21'
updated_date: '2026-04-12 19:33'
labels: []
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Improve the judging-criteria editor in the account hackathon settings tab so criteria save failures are visible where the action happens and required criterion fields are validated on the client before the request is sent.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Saving criteria is blocked client-side when a criterion is missing a required field.
- [x] #2 Criterion rows show clear inline field errors for missing required values before any request is sent.
- [x] #3 Server-side criteria save failures are surfaced inside the criteria section immediately above the Save criteria action instead of only through the page-level admin error alert.
- [x] #4 Relevant automated tests cover the validation behavior.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Confirmed the existing hackathon and evaluation-criteria docs remain unchanged by this UI-only validation fix.

Moved client-side criteria validation into shared admin-workspace utilities so missing criterion names, descriptions, and invalid weights are blocked before any mutation request is sent.

Kept save-failure alerts in the criteria card for server-side responses only, with field-level inline errors handling client-side validation states.

Test gap: coverage is unit-level for the shared criteria-validation helper; this panel does not yet have dedicated component or BDD automation for inline alert placement.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added client-side validation for the account hackathon criteria editor so missing criterion names, descriptions, and invalid weights are caught before save requests are sent, with inline field errors shown on the affected rows. Server-side criteria save failures now render inside the criteria card immediately above Save criteria instead of only through the page-level admin error banner. Added unit coverage for the reusable criteria-validation helper and verified with bun run lint, bun run typecheck, and bun run test:unit.

Test gap: the new validation rules are covered by unit tests, but the inline server-error placement in the settings panel is not yet exercised by dedicated component or BDD automation.

Follow-up: no further product or documentation changes are needed for this fix.
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
