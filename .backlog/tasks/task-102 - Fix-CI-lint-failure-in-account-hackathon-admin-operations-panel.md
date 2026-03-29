---
id: TASK-102
title: Fix CI lint failure in account hackathon admin operations panel
status: Done
assignee: []
created_date: '2026-03-29 18:57'
updated_date: '2026-03-29 18:58'
labels:
  - ci
  - lint
  - admin-ui
dependencies: []
references:
  - 'https://github.com/MrLesk/codex-hackathons/actions/runs/23716526283'
  - >-
    /Users/alex/projects/codex-hackathons/app/components/account/hackathons/AccountHackathonAdminOperationsPanel.vue
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Investigate the failing GitHub Actions run and resolve the actual blocking CI error so the backend-checks workflow passes again. The referenced Actions run fails in the lint job on a stylistic arrow-parens violation in the account hackathon admin operations panel; fix that regression and verify the relevant local checks.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The blocking lint failure from the referenced GitHub Actions run is resolved locally.
- [x] #2 Relevant local validation passes for the affected CI path.
- [x] #3 The task records the concrete root cause and the validation performed.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
The referenced GitHub Actions run failed only in `backend-checks / Lint`. The blocking error was an `@stylistic/arrow-parens` violation in `AccountHackathonAdminOperationsPanel.vue` at the `targetApplications.map(...)` call inside `approveApplicationGroup`. Canonical docs were confirmed unchanged because this is a lint-only fix.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Inspected GitHub Actions run `23716526283` with `gh run view --log-failed` and confirmed the only blocking CI failure was a lint error in `app/components/account/hackathons/AccountHackathonAdminOperationsPanel.vue:587`. Fixed the regression by removing the unnecessary parentheses around the single `application` argument in the async `map` callback used by `approveApplicationGroup`. Validation passed locally with `bun run lint`, `bun run test:unit`, and `bun run typecheck`. Residual note: the repo still emits the existing `vue/no-v-html` warnings during lint, but they are warnings only and were not part of the failing CI condition.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
