---
id: TASK-205.1
title: Implement configurable judging schema and hackathon configuration APIs
status: Done
assignee: []
created_date: '2026-04-12 22:07'
updated_date: '2026-04-13 07:50'
labels:
  - judging
  - backend
  - schema
dependencies:
  - TASK-204
references:
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/schema-outline.md
  - docs/api-surface.md
parent_task_id: TASK-205
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update persisted hackathon and assignment data structures, lifecycle enums, and hackathon create/read/update API shapes so the runtime can express the canonical configurable judging model before higher-level workflow changes land.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Hackathon persistence and serialization expose blindReviewCount, pitchReviewEnabled, blindScoreWeightPercent, and pitchScoreWeightPercent with canonical defaults and validation.
- [x] #2 Runtime hackathon state enums and exposed API shapes use blind_review, shortlist, pitch_review, final_deliberation, winners_announced, and completed consistently.
- [x] #3 Hackathon create, read, list, and update flows propagate the new judging configuration without breaking existing operator-facing configuration screens.
- [x] #4 Targeted backend and type-level validation for the new schema and API shapes passes locally.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Schema, API, and app config surfaces now support configurable blind review count, optional pitch review, weighted blind/pitch scoring defaults, and canonical lifecycle states.

Database schema, request/serialization helpers, admin settings UI, and client state mirrors are aligned with the configurable judging model with targeted validation and tests in place.
<!-- SECTION:FINAL_SUMMARY:END -->

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
