---
id: TASK-205.1.1.2.2
title: >-
  Extend hackathon serialization and public state handling for configurable
  judging
status: Done
assignee:
  - Codex
created_date: '2026-04-13 05:51'
updated_date: '2026-04-13 06:00'
labels:
  - judging
  - backend
dependencies:
  - TASK-205.1.1.2.1
references:
  - docs/api-surface.md
  - docs/lifecycle-and-state-machines.md
parent_task_id: TASK-205.1.1.2
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update hackathon-management serializers and public-visible state helpers so the new judging config fields and canonical state names are emitted consistently from server utilities.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 serializeHackathon and related helpers include the configurable judging fields.
- [ ] #2 buildHackathonUpdatePayload carries the new fields through partial updates.
- [ ] #3 Server-side public-visible state handling replaces judge_review with blind_review and includes pitch_review and final_deliberation where applicable.
- [ ] #4 Targeted utility tests for serialization and state handling pass locally.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update server/utils/hackathon-management.ts so public hackathon visibility uses the canonical judging states: replace judge_review with blind_review and include pitch_review plus final_deliberation.
2. Extend serializeHackathon(...) to return the configurable judging fields already present on the hackathon record: blindReviewCount, pitchReviewEnabled, blindScoreWeightPercent, and pitchScoreWeightPercent.
3. Leave serializePublicHackathon judging config unchanged unless existing behavior already exposes equivalent internal config; only adjust public state handling if needed.
4. Add or adjust one or two focused unit tests in tests/unit/server/utils/hackathon-management.test.ts for serializer output and public state visibility.
5. Run a targeted validation command for the touched unit test file and record the result without changing route handlers, app code, or backlog completion state.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Updated public hackathon visibility states to include blind_review, pitch_review, and final_deliberation instead of judge_review.

serializeHackathon now includes blindReviewCount, pitchReviewEnabled, blindScoreWeightPercent, and pitchScoreWeightPercent.

Targeted validation passed: `bun x vitest run tests/unit/server/utils/hackathon-management.test.ts`.
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
