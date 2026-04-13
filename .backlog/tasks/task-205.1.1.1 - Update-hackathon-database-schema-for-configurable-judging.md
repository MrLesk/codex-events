---
id: TASK-205.1.1.1
title: Update hackathon database schema for configurable judging
status: Done
assignee: []
created_date: '2026-04-13 05:47'
updated_date: '2026-04-13 06:05'
labels:
  - judging
  - backend
  - schema
dependencies:
  - TASK-204
references:
  - docs/schema-outline.md
  - docs/lifecycle-and-state-machines.md
parent_task_id: TASK-205.1.1
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the canonical backend schema so hackathons persist the configurable judging fields and use the canonical lifecycle state enum values.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The hackathon schema adds blindReviewCount, pitchReviewEnabled, blindScoreWeightPercent, and pitchScoreWeightPercent with canonical defaults.
- [ ] #2 Schema-level constraints enforce the documented blind review count and score weight invariants.
- [ ] #3 The hackathon state enum replaces judge_review with blind_review and includes pitch_review and final_deliberation.
- [ ] #4 Targeted schema or type validation for the touched backend file passes locally.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Schema edit landed in server/database/schema.ts with configurable judging columns and canonical state enum values.

Supervisor typecheck confirmed expected compile fallout in downstream hackathon-management and judging route references that still use judge_review; follow-on tasks will clear that.

Targeted validation passed: `bun x vitest run tests/unit/server/database/schema.test.ts`.
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
