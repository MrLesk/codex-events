---
id: TASK-238
title: Require leaving solo workspace before creating or joining another team
status: Done
assignee:
  - '@Codex'
created_date: '2026-04-17 12:45'
updated_date: '2026-04-17 12:48'
labels:
  - participant-experience
  - teams
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Canonicalize the participant solo-team flow so solo participants must leave their existing solo team before they can create or join another team. Remove the old solo-team replacement path from the participant workspace and create-team API contract, and align docs/tests with that behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Participant workspace does not show the create-team card while the participant is still in a solo team.
- [x] #2 Creating a regular team is allowed only when the participant has no active team membership; the create-team API no longer accepts the solo-team replacement flag.
- [x] #3 Docs and tests describe the canonical flow as leaving the solo team before creating or joining another team.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Canonicalized the solo-team transition so participants must leave a solo workspace before creating or joining another team. Removed the solo-team replacement flag from the participant create-team flow and backend route, hid the solo create-team card in the workspace, and aligned the team docs plus participant team tests with the leave-first rule. Validation passed with `bun run lint`, `bun run typecheck`, and `bun run test:unit`; the Playwright BDD suite was not run, so the updated feature coverage remains unverified end-to-end in this pass.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [x] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
