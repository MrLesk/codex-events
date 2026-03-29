---
id: TASK-100
title: >-
  Fix participant row hydration after stage clicks and simplify unmatched
  teammate UI
status: Done
assignee: []
created_date: '2026-03-29 18:10'
updated_date: '2026-03-29 18:12'
labels:
  - ui
  - admin
  - hackathons
dependencies: []
references:
  - >-
    /Users/alex/projects/codex-hackathons/app/components/admin/AdminApplicationsReviewPanel.vue
  - >-
    /Users/alex/projects/codex-hackathons/app/components/account/hackathons/AccountHackathonAdminOperationsPanel.vue
  - >-
    /Users/alex/projects/codex-hackathons/server/api/hackathons/[hackathonId]/applications/[applicationId]/actions/approve.post.ts
  - >-
    /Users/alex/projects/codex-hackathons/server/api/hackathons/[hackathonId]/applications/[applicationId]/actions/reject.post.ts
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Resolve the remaining Participants Applications staging bug where stage clicks partially strip card content after local row updates, and simplify likely-team group presentation by removing the summary header block and rendering unmatched teammate hints as lightweight unmatched participant rows below the matched participants.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Staging approve or reject on a participant row keeps the row fully hydrated, including user display fields and the rest of the visible matched group.
- [x] #2 The likely-team summary header block above the participant rows is removed.
- [x] #3 Unmatched teammate hints render below the matched participants as lightweight unmatched participant rows that show only the unmatched participant label, full name, and email.
- [x] #4 Matched participant rows and decision controls continue to work as before after the unmatched-row layout change.
- [x] #5 Local validation passes after the participant review update.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Canonical docs were confirmed unchanged for this participant review UI refinement.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed the remaining stage-click hydration bug by changing the local application replacement path to merge stage-action responses into the existing application records instead of overwriting hydrated client-only fields like `user` and `applicationTermsDocument`. This keeps participant cards and matched groups visually stable after Approve or Reject clicks even though the stage-action API responses remain minimal. Simplified the participant review group UI by removing the likely-team summary header block entirely and rendering unmatched teammate hints as lightweight unmatched participant rows below the matched participants in the same card stack. Risks/follow-up: the hydration fix currently lives in the client merge path rather than changing the stage-action API to always return fully hydrated application records, so other future consumers of those endpoints should not assume the response includes nested user data.

Validation passed with `bun run test:unit` and `bun run typecheck`.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [x] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
