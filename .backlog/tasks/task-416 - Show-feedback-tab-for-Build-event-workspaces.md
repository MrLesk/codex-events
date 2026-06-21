---
id: TASK-416
title: Show feedback tab for Build event workspaces
status: Done
assignee:
  - '@codex'
created_date: '2026-06-21 11:42'
updated_date: '2026-06-21 11:44'
labels:
  - frontend
  - bug
dependencies: []
references:
  - docs/permissions-matrix.md
  - docs/domain-model.md
modified_files:
  - app/domains/events/account-workspace-tabs.ts
  - tests/unit/app/domains/events/account-workspace-tabs.test.ts
priority: high
ordinal: 95000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Production Build events can collect feedback after completion, but the account workspace tab resolver currently only exposes the Feedback tab for Hackathon events. Event staff, judges, event admins, and platform admins need the Feedback tab on Build and Meetup event workspaces when they have feedback-result access.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Judges, staff, event admins, and platform admins see the Feedback tab for Build and Meetup event workspaces.
- [x] #2 Approved participants without judge, staff, event admin, or platform admin access do not see feedback results.
- [x] #3 Hackathon-only tabs remain hidden for registration-only event types.
- [x] #4 Unit tests cover Build/Meetup feedback-tab visibility.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the account workspace tab resolver so Feedback is shown whenever the actor has feedback-result access, independent of event type.
2. Update unit tests for Meetup and Build workspaces to preserve hidden competition-only tabs while asserting Feedback is visible to authorized actors only.
3. Run the focused tab-access unit tests, then required validation before committing.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Confirmed the production public event metadata for codex-build-vienna-2026-06-20 reports eventType=build and state=completed. The backend feedback result endpoint and question definitions already support Build and Meetup events, so the fix is limited to account tab visibility.

Validation passed: bun run lint; bun run typecheck; bun run test:unit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Removed the hackathon-only Feedback tab guard and updated account workspace tab tests so authorized actors can view Feedback for Hackathon, Meetup, and Build events while participants without result access still cannot. Verified with lint, typecheck, and unit tests.
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
