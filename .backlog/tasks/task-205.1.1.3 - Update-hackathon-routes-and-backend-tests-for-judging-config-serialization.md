---
id: TASK-205.1.1.3
title: Update hackathon routes and backend tests for judging config serialization
status: Done
assignee:
  - codex
created_date: '2026-04-13 05:47'
updated_date: '2026-04-13 06:05'
labels:
  - judging
  - backend
  - tests
dependencies:
  - TASK-205.1.1.2
references:
  - docs/api-surface.md
parent_task_id: TASK-205.1.1
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the hackathon create/read/update/list routes and backend route coverage so the new judging config fields and canonical state names are exercised end to end on the server side.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Hackathon create, list, get, and patch routes return the configurable judging fields.
- [ ] #2 Route coverage asserts the new fields and canonical state names where this task touches server responses.
- [ ] #3 Required targeted backend tests pass locally for the changed routes.
- [ ] #4 This task stays backend-only and does not update app-side config forms or presentation helpers.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update server/api/hackathons/index.post.ts so the hackathon insert persists blindReviewCount, pitchReviewEnabled, blindScoreWeightPercent, and pitchScoreWeightPercent from the validated create body.
2. Verify the existing list, get, and patch routes already return the judging config fields through serializeHackathon; avoid route changes unless a response path is missing a field.
3. Extend integration coverage in tests/integration/server/api/hackathon-routes.test.ts and tests/integration/server/api/hackathon-admin-routes.test.ts so create, list, get, and patch responses assert the new judging config fields on the affected CRUD responses.
4. Run targeted integration tests for the changed hackathon route coverage and keep the task backend-only without touching action routes or app/client files.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Create route now persists blindReviewCount, pitchReviewEnabled, blindScoreWeightPercent, and pitchScoreWeightPercent.

Added integration coverage for list/get/create/patch hackathon CRUD responses plus the required schema SQL migration for the test harness.

Targeted validation passed: `bun x vitest run --config vitest.integration.config.ts tests/integration/server/api/hackathon-routes.test.ts --testNamePattern="GET /api/hackathons hides draft hackathons from public callers|GET /api/hackathons/:hackathonId returns current term references for visible hackathons|POST /api/hackathons creates draft hackathons for platform admins and writes audit|PATCH /api/hackathons/:hackathonId updates configuration for hackathon admins"`.
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
