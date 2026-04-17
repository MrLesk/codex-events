---
id: TASK-251
title: Consolidate account hackathon Teams tab to one canonical panel
status: Done
assignee:
  - '@codex'
created_date: '2026-04-17 16:31'
updated_date: '2026-04-17 16:36'
labels: []
dependencies: []
documentation:
  - 'app/pages/account/hackathons/[slug]/index.vue'
  - app/components/account/hackathons/AccountHackathonParticipantTeamPanel.vue
  - app/components/account/hackathons/AccountHackathonTeamVisibilityPanel.vue
  - app/utils/account-hackathon-tabs.ts
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The account hackathon page currently wires the Teams tab through two different panel components even though the tab is only available to actors who already satisfy the richer participant-team surface requirements. Consolidate the Teams tab onto one canonical panel so team visibility and dissolved-team behavior come from a single code path.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The account hackathon Teams tab renders through one canonical panel path for all actors who can access that tab.
- [x] #2 Existing admin, staff, and approved-participant Teams-tab behavior remains intact after the consolidation.
- [x] #3 Dissolved-team visibility in the Teams tab continues to follow the documented admin/staff vs participant rules.
- [x] #4 Automated coverage is updated or confirmed for the consolidated Teams-tab routing behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Confirm the Teams-tab access matrix and remove the unreachable secondary panel branch so the page routes all Teams-tab access through the canonical participant-team panel.
2. Keep dissolved-team visibility behavior unchanged by relying on the existing team-visibility API rules instead of introducing new fallback logic.
3. Add or update focused coverage for the consolidated Teams-tab routing behavior, then run bun run lint, bun run typecheck, and bun run test:unit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Confirmed the Teams tab access matrix is already owned by app/utils/account-hackathon-tabs.ts, and every actor who can reach `teams` already satisfies the canonical participant-team panel path.

Removed the unreachable AccountHackathonTeamVisibilityPanel branch from the account hackathon page and deleted the now-dead component so the Teams tab has one canonical rendering path.

Preserved dissolved-team visibility behavior by leaving the existing API authorization rules unchanged: participant-facing team reads exclude dissolved teams, while staff/admin reads can include them for operational context.

Added a focused tab-access test proving the Teams tab is only exposed to actors who already qualify for the canonical participant-team panel, then reran bun run lint, bun run typecheck, and bun run test:unit successfully.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Consolidated the account hackathon Teams tab onto a single rendering path by always using `AccountHackathonParticipantTeamPanel` and removing the unreachable `AccountHackathonTeamVisibilityPanel` fallback component. This keeps team visibility, dissolved-team handling, and team-detail behavior on one canonical surface.

Added focused coverage in `tests/unit/app/utils/account-hackathon-tabs.test.ts` to prove the Teams tab is only available to approved participants, managers, or actors with participant-and-team visibility, which are the same actors that already qualify for the canonical panel path. Existing participant-vs-staff dissolved-team visibility rules remain unchanged because they still come from the existing team API authorization behavior.

Risk / follow-up: if the product later introduces a new actor who can access the Teams tab without one of those existing grants, the tab-access helper and page routing should be updated together rather than reintroducing a second panel path.
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
