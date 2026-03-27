---
id: TASK-42
title: Switch registration form to submit-attempt validation display
status: In Progress
assignee: []
created_date: '2026-03-27 19:11'
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
- [ ] #1 Registration field errors are hidden on initial render.
- [ ] #2 Clicking submit with invalid form reveals field-level errors and prevents submission.
- [ ] #3 Submit button is not disabled due to validation errors alone.
- [ ] #4 Form still prevents submission while an existing request is pending.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Canonical docs were updated or confirmed unchanged
- [ ] #2 Code behavior matches canonical docs
- [ ] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [ ] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [ ] #7 Auth and permissions changes follow the documented platform model
- [ ] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
