---
id: TASK-77
title: Move account hackathon prize configuration into the Prizes tab
status: Done
assignee:
  - codex
created_date: '2026-03-29 14:48'
updated_date: '2026-03-29 14:56'
labels: []
dependencies: []
documentation:
  - docs/permissions-matrix.md
  - docs/api-surface.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the shared account hackathon detail surface so prize configuration lives under the Prizes tab instead of the Settings tab. The admin editing controls should be available only to hackathon admins and platform admins, while non-admin actors should continue to see only the participant-safe prize view when prizes are published.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The account hackathon detail surface renders prize configuration under the Prizes tab instead of the Settings tab.
- [x] #2 Hackathon admins and platform admins can access the Prizes tab even when no prizes have been published yet so they can create prize definitions.
- [x] #3 Non-admin actors do not see admin prize-configuration controls on the account hackathon detail surface.
- [x] #4 The Settings tab no longer shows prize-configuration controls.
- [x] #5 Automated coverage is updated for the tab-availability and role-gating behavior changed by this task.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a small account-hackathon tab access utility so tab availability and prize-config role gating are centralized and unit-testable.
2. Update the account hackathon detail page to use that utility, keep the public prize list in the Prizes tab, and render the admin prize-configuration panel there only for hackathon admins and platform admins.
3. Refactor the admin settings panel so judging criteria and prize configuration are separate sections, then remove the prize-configuration section from the Settings-tab rendering.
4. Update focused unit coverage for the new tab access behavior and the admin-shell navigation behavior for the Prizes tab.
5. Run the required validation surface, at minimum bun run test:unit, then finish the task summary with any residual risk or gaps.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Confirmed canonical docs remain unchanged for this UI move: permissions still restrict admin prize configuration to hackathon admins and platform admins, and public prize reads remain participant-safe.

Observed an unrelated local worktree modification in app/components/account/hackathons/AccountHackathonRoleRosterPanel.vue and left it untouched.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Moved account-hackathon prize configuration out of the Settings-tab rendering and into the Prizes tab while keeping the public prize list visible there.

Added app/utils/account-hackathon-tabs.ts so tab availability and admin prize-configuration gating are centralized: hackathon admins and platform admins now keep access to the Prizes tab even before any prizes are published, while non-admins do not get admin prize-editing controls.

Refactored AccountHackathonAdminSettingsPanel so program settings, terms management, judging criteria, and prize configuration can be rendered independently. The Settings tab now renders program settings, terms, and judging criteria only; the Prizes tab renders the prize configuration panel only for admin-capable actors.

Added focused unit coverage in tests/unit/app/utils/account-hackathon-tabs.test.ts and expanded shell-navigation coverage for the Prizes tab in tests/unit/app/utils/shell-navigation.test.ts.

Validation: bunx vitest run tests/unit/app/utils/account-hackathon-tabs.test.ts tests/unit/app/utils/shell-navigation.test.ts; bun run test:unit; bun run typecheck. bun run lint completed with existing vue/no-v-html warnings in app/pages/hackathons/[slug]/application-terms.vue, app/pages/imprint.vue, app/pages/privacy-policy.vue, and app/pages/terms-and-conditions.vue.
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
