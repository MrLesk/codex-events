---
id: TASK-234
title: Guard admin submissions monitor async payload reads in operations panel
status: Done
assignee:
  - '@codex'
created_date: '2026-04-17 10:39'
updated_date: '2026-04-17 10:40'
labels:
  - admin
  - frontend
  - bug
dependencies: []
references:
  - app/components/account/hackathons/AccountHackathonAdminOperationsPanel.vue
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fix the admin operations submissions view so SSR and first render do not crash when the submission monitor async payload has not resolved yet. The operations panel should treat the monitor payload as nullable until populated and continue rendering the submissions dashboard safely.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The admin submissions view does not throw when `submissionMonitorData` is still undefined during render.
- [x] #2 The submissions dashboard continues to build operational team data from empty arrays until the async monitor payload arrives.
- [x] #3 Required local validation passes for the change.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Guarded the admin operations submissions monitor reads so the component treats `submissionMonitorData` as nullable until `useAsyncData` has produced its payload. `submissionOperationalTeams` now falls back to empty `teamDetails` and `teamSubmissions` arrays during SSR and first render, which prevents the `Cannot read properties of undefined (reading 'teamDetails')` crash on the submissions tab. Validation passed with `bun run lint`, `bun run typecheck`, and `bun run test:unit`. No canonical docs or config changes were needed. Test gap: no dedicated component-level regression was added because this repo does not currently use a Vue component test harness for page-level async SSR state; the fix is covered by full lint/typecheck/unit validation only.
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
