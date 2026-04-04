---
id: TASK-183
title: Fix hydration mismatches on the account hackathon Team tab
status: Done
assignee:
  - '@codex'
created_date: '2026-04-04 11:42'
updated_date: '2026-04-04 11:54'
labels: []
dependencies: []
documentation:
  - >-
    /Users/alex/projects/codex-hackathons/app/components/account/hackathons/AccountHackathonParticipantTeamPanel.vue
  - >-
    /Users/alex/projects/codex-hackathons/app/components/shell/AppShellSidebar.vue
  - >-
    /Users/alex/projects/codex-hackathons/app/components/shell/AppShellNavigation.vue
  - /Users/alex/projects/codex-hackathons/app/layouts/profile.vue
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The account hackathon Team tab at `/account/hackathons/:slug?tab=team` shows repeated hydration mismatch warnings in the browser devtools when viewed in the profile shell as a platform admin. The fix should make the initial SSR markup and the first client render agree without regressing Team tab behavior or shell navigation behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The Team tab no longer produces hydration mismatch warnings on a fresh load in the profile shell for the platform-admin session.
- [x] #2 The Team tab content and profile shell render the same user-visible state after hydration as before the fix.
- [x] #3 Regression coverage is added or updated for the logic that caused the SSR/client mismatch.
- [x] #4 Local validation passes with bun run lint bun run typecheck and bun run test:unit.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Reproduced the exact hydration warnings on `http://localhost:3000/account/hackathons/codex-vienna-2026-04-18?tab=team` in the platform-admin session. Vue reported class mismatches in `AppShellNavigation`: the server marked `/account` active while the client expected `/account/admin`, and vice versa.

The root cause was the shell navigation mode depending on page-owned shared state that was initialized as `participant` during SSR and then flipped to `admin` on the client. A first attempt to initialize that state earlier in the page was still too late for the profile layout render order.

Fixed by removing the page-to-layout shared-state dependency for shell navigation mode. The profile shell now derives account-hackathon navigation mode directly from the current route, resolved hackathon id, and authenticated actor roles inside `useShellNavigation`, and passes that mode into `AppShellSidebar` and `AppShellNavigation` as props.

Manual browser verification on the exact page now shows no hydration mismatch warnings after reload, and the sidebar remains visually correct with the admin dashboard highlighted.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Eliminated the Team tab hydration mismatches on the platform-admin account hackathon page by moving shell navigation mode resolution out of page-owned shared state and into route-aware shell logic. The sidebar now computes whether `/account` or `/account/admin` should be active from the current hackathon context during SSR and on the client, so the initial markup matches hydration.

Updated shell navigation tests with regression coverage for account-hackathon navigation mode resolution. Local validation passed with `bun run lint`, `bun run typecheck`, and `bun run test:unit`, and a fresh reload of `http://localhost:3000/account/hackathons/codex-vienna-2026-04-18?tab=team` in the platform-admin session no longer logs hydration mismatches.

No config or workflow documentation changes were required because this fix only adjusted existing shell-navigation runtime logic and tests.
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
