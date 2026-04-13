---
id: TASK-205.1.2.2
title: Add judging configuration controls to the admin hackathon settings form
status: Done
assignee: []
created_date: '2026-04-13 06:06'
updated_date: '2026-04-13 06:13'
labels:
  - judging
  - frontend
  - admin
dependencies:
  - TASK-205.1.2.1
references:
  - docs/api-surface.md
  - docs/domain-model.md
parent_task_id: TASK-205.1.2
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the admin hackathon configuration UI and form validation so admins can set blind review count, pitch review enablement, and stage weights from the existing settings workflow.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Admin config form renders controls for blindReviewCount, pitchReviewEnabled, blindScoreWeightPercent, and pitchScoreWeightPercent.
- [ ] #2 Form validation and payload construction use canonical defaults and constraints.
- [ ] #3 Settings UI copy remains operator-facing and avoids leaking implementation detail.
- [ ] #4 Targeted app-side tests or form validation tests pass locally.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Admin hackathon settings form now validates and submits blindReviewCount, pitchReviewEnabled, blindScoreWeightPercent, and pitchScoreWeightPercent.

Targeted validation passed: `bun x vitest run tests/unit/app/utils/form-schemas.test.ts`.

Supervisor typecheck confirmed the form/type complaint is resolved; remaining failures are backend judging routes that still use judge_review.
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
