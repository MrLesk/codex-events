---
id: TASK-205.2.4.1
title: Refactor shortlist backend for finalist selection
status: Done
assignee:
  - Codex
created_date: '2026-04-13 07:04'
updated_date: '2026-04-13 07:17'
labels:
  - judging
  - backend
dependencies:
  - TASK-205.2.3
references:
  - docs/domain-model.md
  - docs/api-surface.md
  - docs/lifecycle-and-state-machines.md
parent_task_id: TASK-205.2.4
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace shortlist reorder semantics with persisted ordered finalist selection for blind-plus-pitch hackathons while keeping shortlist views blind and stage-correct.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Shortlist start and shortlist view behavior match the canonical blind-review-only finalist selection role.
- [x] #2 `POST /api/hackathons/:hackathonId/shortlist/actions/select-finalists` persists the ordered finalist submission IDs for pitch-enabled blind-review hackathons.
- [x] #3 Targeted backend tests cover shortlist selection persistence and shortlist response behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Refactor shortlist utilities to treat shortlist as the blind leaderboard plus persisted finalist-selection metadata from hackathons.pitchFinalistSubmissionIdsJson instead of audit-log ordering or final-rank semantics.
2. Tighten shortlist guards so start-shortlist is allowed only for blind-plus-pitch hackathons and GET /shortlist is stage-correct for shortlist only.
3. Replace POST /shortlist/actions/reorder with POST /shortlist/actions/select-finalists, validate an ordered subset of ranked blind-review submissions, persist the ordered IDs on the hackathon row, and emit a shortlist finalist-selection audit entry.
4. Update shortlist-focused unit and integration tests for the new selection persistence and shortlist response behavior, then run targeted validation for the changed area.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Scoped to shortlist-only backend behavior: replace shortlist reorder semantics with persisted ordered finalist selection and align shortlist views/guards to the canonical blind-review finalist-selection role.

Implemented shortlist backend refactor to remove audit-log reorder semantics, persist ordered finalists on hackathons.pitchFinalistSubmissionIdsJson, keep GET /shortlist blind and shortlist-only, and replace the reorder route with POST /shortlist/actions/select-finalists. Targeted validation run: bunx eslint on the changed shortlist files plus the directly-related endpoint caller, bunx vitest run tests/unit/server/utils/shortlist.test.ts, bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/outcome-routes.test.ts, and bun run typecheck.

Replaced shortlist reorder semantics with persisted ordered finalist selection on `hackathons.pitchFinalistSubmissionIdsJson`, added `POST /shortlist/actions/select-finalists`, constrained shortlist startup/view behavior to the canonical blind-plus-pitch shortlist phase, and updated the existing admin caller to use the new route path.
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
