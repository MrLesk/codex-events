---
id: TASK-99
title: >-
  Make staged participant decisions undoable and stop scroll jumps on stage
  clicks
status: Done
assignee: []
created_date: '2026-03-29 17:58'
updated_date: '2026-03-29 18:00'
labels:
  - ui
  - api
  - admin
  - hackathons
dependencies: []
references:
  - >-
    /Users/alex/projects/codex-hackathons/app/components/account/hackathons/AccountHackathonAdminOperationsPanel.vue
  - >-
    /Users/alex/projects/codex-hackathons/app/components/admin/AdminApplicationsReviewPanel.vue
  - >-
    /Users/alex/projects/codex-hackathons/server/api/hackathons/[hackathonId]/applications/[applicationId]/actions/approve.post.ts
  - >-
    /Users/alex/projects/codex-hackathons/server/api/hackathons/[hackathonId]/applications/[applicationId]/actions/reject.post.ts
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refine the admin Participants Applications workflow so staging an approval or rejection updates the visible row in place, preserves the reviewer’s position in long lists, and allows the same decision button to clear a staged decision when clicked again. This requires aligning the application stage-action API with the new toggle interaction instead of forcing a broad workspace refresh after every click.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Clicking Approve or Reject on a submitted participant updates the visible staged state without a broad workspace refresh that sends the reviewer back to the top of the page.
- [x] #2 Clicking the same staged decision button again clears that staged decision for the participant.
- [x] #3 Approve Team applies approval to every visible submitted participant in the group, and clicking it again when the full visible group is staged approved clears those staged approvals.
- [x] #4 Application stage-action API behavior and automated coverage are updated to reflect the toggle interaction.
- [x] #5 Local validation passes after the participant staging workflow change.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Canonical docs were confirmed unchanged for this admin staging workflow refinement.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Changed the application stage-action API so approving or rejecting the same submitted application twice toggles the staged decision back to null, with audit logging distinguishing staged decisions from cleared ones. Updated the Participants Applications client flow to merge stage-action responses directly into the local applications list instead of refreshing the full admin workspace, which keeps reviewers on the same part of the page while preserving immediate visual feedback. Adjusted Approve Team so it stages approval for only the not-yet-approved visible participants when activating the group decision, and clears all visible staged approvals when the full visible group is already staged approved. Risks/follow-up: the scroll-preservation improvement is achieved by avoiding the broad workspace refresh path for stage clicks, so it is covered indirectly by the local-update flow rather than by a dedicated browser automation assertion.

Validation passed with `bun run test:unit`, `bun run typecheck`, and `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/application-routes.test.ts`.
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
