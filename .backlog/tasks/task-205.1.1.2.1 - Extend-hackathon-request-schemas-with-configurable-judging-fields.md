---
id: TASK-205.1.1.2.1
title: Extend hackathon request schemas with configurable judging fields
status: Done
assignee: []
created_date: '2026-04-13 05:51'
updated_date: '2026-04-13 05:56'
labels:
  - judging
  - backend
dependencies:
  - TASK-205.1.1.1
references:
  - docs/api-surface.md
parent_task_id: TASK-205.1.1.2
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update hackathon-management request schemas so create and update payloads accept the configurable judging fields with the canonical validation constraints.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 hackathonConfigShape adds blindReviewCount, pitchReviewEnabled, blindScoreWeightPercent, and pitchScoreWeightPercent.
- [ ] #2 createHackathonBodySchema and updateHackathonBodySchema validate the new fields with canonical defaults and bounds.
- [ ] #3 Targeted utility tests covering request-schema validation pass locally.
- [ ] #4 This task stays within hackathon-management validation and does not change route handlers.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Updated hackathon-management request schemas with blindReviewCount, pitchReviewEnabled, blindScoreWeightPercent, and pitchScoreWeightPercent defaults/bounds.

Targeted validation passed: `bun x vitest run tests/unit/server/utils/hackathon-management.test.ts -t "parses configurable judging fields in create and update request schemas"`.
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
