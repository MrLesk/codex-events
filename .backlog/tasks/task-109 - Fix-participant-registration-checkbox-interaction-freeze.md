---
id: TASK-109
title: Fix participant registration checkbox interaction freeze
status: Done
assignee:
  - codex
created_date: '2026-03-29 21:32'
updated_date: '2026-03-29 21:37'
labels:
  - bug
  - frontend
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The authenticated participant registration page at `/hackathons/:slug/register` can freeze the page after interacting with the in-person commitment or application-terms checkboxes. The fix should preserve the current participant registration flow while removing the reactive sync loop in the registration form state.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Clicking either registration checkbox or its label keeps the registration page responsive.
- [x] #2 Participant registration form state still stays in sync between the parent page and `HackathonRegistrationPanel`.
- [x] #3 Regression coverage exists for the reactive sync path that previously froze the page.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update `HackathonRegistrationPanel` so syncing `vee-validate` values back to the parent models does not replace `teamMemberHints` with a new array on every checkbox change.
2. Add focused unit coverage for the sync path to prove checkbox/model updates do not recurse indefinitely.
3. Run targeted validation plus `bun run test:unit` before shipping.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Root cause: `HackathonRegistrationPanel` replaced `teamMemberHints` with a fresh array during `watch(values, ...)`, so a checkbox change could bounce through the reactive sync path and recurse until the page froze.

Local browser verification after the fix on `http://localhost:3000/hackathons/codex-bengaluru-2026-04-16/register`: direct checkbox clicks and label clicks both toggled without freezing the page.

`HackathonRegistrationPanel.vue`, `participant-application.ts`, and `participant-application.test.ts` were updated. Docs remain unchanged because this is an implementation bug fix, not a product-rule change.

Validation passed: `bunx vitest run tests/unit/app/utils/participant-application.test.ts`, `bun run typecheck`, `bun run test:unit`.

Residual risk: production will continue to exhibit the freeze until this commit is deployed through the production release path.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Prevented the participant registration page from freezing on checkbox interaction by avoiding redundant `teamMemberHints` array replacement during the `vee-validate` to parent-model sync. Added value-based hint comparison plus a reactive regression test, and manually verified on a local registration route that checkbox and label clicks remain responsive.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [x] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
