---
id: TASK-260
title: Show disqualification notes in the admin submissions tab
status: Done
assignee: []
created_date: '2026-04-17 19:44'
updated_date: '2026-04-17 19:47'
labels:
  - admin-ui
  - submissions
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Hackathon admins need to see the recorded disqualification note when reviewing a disqualified team in the submissions tab. The submissions surface should display the note only when one was recorded and should avoid showing an empty placeholder when the disqualification was saved without a note.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A disqualified team row in the admin submissions tab shows the recorded disqualification note when one exists.
- [x] #2 The submissions tab does not render an empty disqualification-note section when the disqualification was recorded without a note.
- [x] #3 Automated coverage verifies the admin submissions data flow or UI behavior for both note-present and note-empty cases.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend the admin-facing submission response to include the recorded disqualification reason for hackathon admins by reading the existing submission disqualification audit log entry.
2. Render the disqualification reason in the admin submissions team details only when the submission is disqualified and the reason is non-empty.
3. Add automated coverage for note-present and note-empty submission responses, then run the required validation commands.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Used the existing submission route consumed by the admin submissions monitor instead of adding a new audit-log fetch path, which keeps the UI change small and avoids making the whole submissions panel depend on an additional request.

Kept the disqualification reason admin-only by resolving it in the submission GET handler only when the viewer has hackathon-admin access.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Extended the admin-facing submission response to include a `disqualificationReason` derived from the existing `submission.disqualified` audit log entry when a hackathon admin loads a disqualified submission. Updated the admin submissions team-details panel to show a dedicated "Disqualification reason" block only when a non-empty reason exists.

Added integration coverage for the admin submission GET route to verify both note-present and note-empty disqualification cases, and updated the shared admin workspace submission fixture to include the new field. Validation completed with `bun run lint`, `bun run typecheck`, `bun run test:unit`, and a targeted integration run via `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/submission-routes.test.ts`.

No canonical docs or config changes were required. No follow-up work was identified from this change.
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
