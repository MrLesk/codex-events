---
id: TASK-228
title: Add admin-controlled pitch presentation lineup before pitch review
status: Done
assignee:
  - codex
created_date: '2026-04-17 08:06'
updated_date: '2026-04-17 10:36'
labels:
  - judging
  - admin
  - frontend
  - backend
dependencies: []
references:
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
  - docs/schema-outline.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the pitch-stage workflow so finalists present live in order during a dedicated presentation phase, admins explicitly advance which team is currently enabled to present, and post-pitch review opens only after the presentation lineup has been completed. Keep the existing reviewer model: every user in the hackathon judge pool receives one pitch-review assignment per finalist after presentations end.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 During the `pitch` state, the platform persists the ordered presentation lineup and the currently enabled finalist presentation so admins can advance teams one at a time without creating review assignments yet.
- [x] #2 `start-pitch-review` remains a separate lifecycle action and is rejected until the pitch presentation lineup has been completed; when it succeeds it creates one pitch-review assignment per finalist submission per judge in the hackathon judge pool.
- [x] #3 The admin competition and operations workspace surfaces the live pitch lineup, current presentation state, and correct lifecycle messaging for pitch-only and blind-plus-pitch hackathons.
- [x] #4 Canonical judging docs and automated coverage are updated to reflect the admin-controlled pitch presentation flow and the post-presentation review transition.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend the canonical hackathon judging model with persisted pitch-stage progress state. Reuse the saved ordered pitch submission list as the presentation lineup for all pitch-enabled hackathons, and add explicit hackathon fields that track which submission is currently enabled to present and whether the lineup has been completed.
2. Update server lifecycle behavior. `start-pitch` should freeze/reset the presentation lineup, a new admin-only pitch-stage action should advance the enabled presenter one team at a time, `start-pitch-review` should remain separate but reject requests until the full pitch lineup has been completed, and disqualification should keep the stored lineup and active presenter state valid.
3. Update admin workspace copy and controls. The competition and operations views should expose the live pitch lineup, identify the currently enabled presenter, and provide the admin control to advance to the next presentation while keeping review assignments closed until the lineup is finished.
4. Update canonical docs and automated coverage. Refresh judging docs to describe the admin-controlled presentation flow and add or adjust unit/integration tests for schema serialization, pitch lifecycle guards, disqualification pruning, and the new pitch-stage action.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
L2 context brief: canonical docs already separate `pitch` and `pitch_review`, but the implementation has no persisted per-team presentation state during `pitch`. Relevant paths are `server/database/schema.ts`, `server/utils/judging.ts`, `server/utils/hackathon-management.ts`, `app/components/account/hackathons/AccountHackathonCompetitionPanel.vue`, `app/components/account/hackathons/AccountHackathonAdminOperationsPanel.vue`, and the judging/admin route tests under `tests/integration/server/api/` plus utility tests under `tests/unit/server/utils/` and `tests/unit/app/utils/`. Main risks are introducing extra state that drifts from the saved finalist order, and letting `start-pitch-review` bypass the live presentation sequence.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented an admin-controlled pitch presentation lineup before pitch review. `start-pitch` now freezes the ordered presentation lineup, a new admin-only `advance-pitch-presentation` action enables finalists one at a time and marks the lineup complete after the last presentation, and `start-pitch-review` is blocked until presentations are finished. The admin competition and operations views now show live pitch progress and updated messaging, canonical judging docs were updated, and disqualification keeps the stored lineup/progress valid. Validation passed with `bun run lint`, `bun run typecheck`, `bun run test:unit`, and targeted integration coverage via `bun run test:integration tests/integration/server/api/hackathon-routes.test.ts tests/integration/server/api/outcome-routes.test.ts`. Residual operational dependency: pitch review now intentionally depends on admins advancing the lineup through every finalist; that dependency is enforced in both the API and admin UI, so no further follow-up is required for this task.
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
