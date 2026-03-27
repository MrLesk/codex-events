---
id: TASK-49
title: >-
  Add in-person hackathon flag and conditional in-person commitment in
  application
status: Done
assignee:
  - codex
created_date: '2026-03-27 21:29'
updated_date: '2026-03-27 21:46'
labels: []
dependencies: []
references:
  - docs/domain-model.md
  - docs/api-surface.md
  - docs/schema-outline.md
  - docs/lifecycle-and-state-machines.md
  - docs/permissions-matrix.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Introduce a canonical hackathon configuration flag for in-person events and require an explicit applicant commitment when applying to an in-person hackathon. The registration UI and backend contracts should expose and enforce this behavior only when the hackathon is marked as in-person.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Hackathon canonical model and API/schema docs include a boolean in-person event field
- [x] #2 Hackathon create/update/read flows persist and return the in-person event flag
- [x] #3 Application submission payload supports an in-person attendance commitment value
- [x] #4 For in-person hackathons, application submission is rejected unless commitment is explicitly accepted
- [x] #5 For non in-person hackathons, no in-person commitment is required
- [x] #6 User hackathon registration UI conditionally shows an in-person commitment section that references the hackathon date and city when in-person is true
- [x] #7 Frontend submission includes the commitment value only in the in-person case
- [x] #8 Relevant tests are added or updated for backend validation and frontend conditional rendering/submit behavior
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1) Update canonical docs (`docs/domain-model.md`, `docs/api-surface.md`, `docs/schema-outline.md`) to add a hackathon-level boolean in-person event flag and conditional application commitment requirement.
2) Add persistence support for `hackathons.in_person_event` in Drizzle schema and create a forward migration SQL file with default false for existing rows.
3) Extend hackathon configuration contracts (create/update schemas, serializers, admin/public API responses, frontend hackathon/admin types, and admin create/edit UI + payloads) to read/write `inPersonEvent`.
4) Extend application submission contracts with `inPersonAttendanceCommitment` and enforce backend guard: if `inPersonEvent=true`, submission requires commitment=true; persist this value in registration details payload.
5) Add conditional registration UI section in public registration form for in-person hackathons with a checkbox that references the event date and city; include this state in client validation and submission policy.
6) Update/extend unit and integration tests for schema fields, hackathon create/update serialization, application submission validation, and registration helper policy behavior.
7) Run validation (`bun run test:unit` at minimum; plus targeted integration if practical), then update task checkboxes/notes and summarize outcomes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented canonical `inPersonEvent` hackathon flag across docs, DB schema/migration, backend create/update/read contracts, and admin configuration UI payloads.

Extended application submission contract with `inPersonAttendanceCommitment` and added backend guard `in_person_attendance_commitment_required` when `inPersonEvent=true`.

Registration UI now conditionally renders an in-person commitment section with date and city text, validates commitment, and sends the commitment field only for in-person hackathons.

Validation executed: `bun run test:unit`, `bun run test:integration -- tests/integration/server/api/application-routes.test.ts tests/integration/server/api/hackathon-routes.test.ts`, and `bun run typecheck` all passed.

Repository contains concurrent parallel-agent edits in other files; this task was implemented to coexist with those changes without reverting them.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added end-to-end support for in-person hackathon commitment. Hackathons now include canonical `inPersonEvent` (DB + API + admin UI). Application submission accepts `inPersonAttendanceCommitment` and rejects in-person applications without explicit commitment. Registration UI now shows a conditional in-person commitment section referencing date and city, enforces client validation, and includes the commitment value only for in-person submissions. Updated canonical docs (`domain-model`, `api-surface`, `schema-outline`) and expanded unit/integration coverage for serialization, policy, route validation, and schema columns. Validation passed for unit tests, targeted integration tests, and typecheck.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [x] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [x] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
