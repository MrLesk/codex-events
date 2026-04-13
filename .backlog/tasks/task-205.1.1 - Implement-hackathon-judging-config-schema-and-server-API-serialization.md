---
id: TASK-205.1.1
title: Implement hackathon judging config schema and server API serialization
status: Done
assignee: []
created_date: '2026-04-12 22:12'
updated_date: '2026-04-13 06:05'
labels:
  - judging
  - backend
  - schema
dependencies:
  - TASK-204
references:
  - docs/schema-outline.md
  - docs/api-surface.md
  - docs/lifecycle-and-state-machines.md
parent_task_id: TASK-205.1
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the database schema, hackathon validation schemas, and hackathon create/read/update/list serializers so the backend persists the canonical configurable judging fields and state enum values.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Hackathon persistence adds blindReviewCount, pitchReviewEnabled, blindScoreWeightPercent, and pitchScoreWeightPercent with canonical defaults and validation constraints.
- [ ] #2 Server-side hackathon schemas and serializers expose the new judging config fields consistently across create, update, read, and list routes.
- [ ] #3 Server-side hackathon state enums and public-visible state serialization replace judge_review with blind_review and add pitch_review and final_deliberation where applicable.
- [ ] #4 Targeted backend tests for hackathon schema and API serialization pass locally.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Backend foundation now covers schema columns, hackathon-management validation/serialization, CRUD route persistence, and targeted backend coverage for schema, utility, and route surfaces.

Remaining typecheck failures are in judging lifecycle/assignment route files that still hardcode judge_review and belong to TASK-205.2 rather than this serialization-focused backend task.
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
