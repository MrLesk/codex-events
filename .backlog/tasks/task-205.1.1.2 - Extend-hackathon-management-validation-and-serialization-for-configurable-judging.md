---
id: TASK-205.1.1.2
title: >-
  Extend hackathon management validation and serialization for configurable
  judging
status: Done
assignee: []
created_date: '2026-04-13 05:47'
updated_date: '2026-04-13 06:00'
labels:
  - judging
  - backend
dependencies:
  - TASK-205.1.1.1
references:
  - docs/api-surface.md
  - docs/schema-outline.md
parent_task_id: TASK-205.1.1
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update hackathon management validation schemas and serializers so backend create/update/list/get flows understand the configurable judging fields and canonical state names.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Hackathon create and update validation schemas accept the configurable judging fields with canonical defaults and constraints.
- [ ] #2 serializeHackathon and related server-side serializers include the new judging fields consistently.
- [ ] #3 Server-side public-visible hackathon state serialization uses blind_review, pitch_review, and final_deliberation where applicable.
- [ ] #4 Targeted backend utility tests pass locally.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Both child tasks are complete: request-schema validation and serializer/public-state handling now reflect configurable judging fields and canonical state names.

Supervisor typecheck now fails only in route files that still hardcode judge_review, which is the next child task scope.
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
