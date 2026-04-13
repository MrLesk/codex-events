---
id: TASK-205.1.2.1
title: Propagate judging config fields through shared app hackathon types
status: Done
assignee: []
created_date: '2026-04-13 06:06'
updated_date: '2026-04-13 06:13'
labels:
  - judging
  - frontend
dependencies:
  - TASK-205.1.1
references:
  - docs/api-surface.md
parent_task_id: TASK-205.1.2
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update shared app-side hackathon record and form-state types so the client can hold the configurable judging fields returned by the backend.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 HackathonRecord and HackathonFormState include blindReviewCount, pitchReviewEnabled, blindScoreWeightPercent, and pitchScoreWeightPercent.
- [ ] #2 Existing helpers that build empty or cloned hackathon config state carry the new fields.
- [ ] #3 Targeted app-side tests for shared hackathon form/type helpers pass locally.
- [ ] #4 This task does not yet render new form controls or change state presentation copy.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Shared app hackathon record and form-state types now include the configurable judging fields, with createEmptyHackathonFormState and createHackathonFormState carrying the canonical defaults/mapping.

Targeted validation passed: `bunx vitest run tests/unit/app/utils/admin-workspace.test.ts`.
<!-- SECTION:NOTES:END -->

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
