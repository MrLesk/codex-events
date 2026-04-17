---
id: TASK-264
title: Add a dedicated staff dashboard for hackathon staff access
status: Done
assignee:
  - Codex
created_date: '2026-04-17 20:31'
updated_date: '2026-04-17 20:39'
labels: []
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/permissions-matrix.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a staff-facing dashboard under the authenticated account area so users with staff access have a clear top-level entry point into the hackathons where they support internal operations. The dashboard should fit the existing actor-specific dashboard pattern used for judges and admins and should take staff users into the account-scoped hackathon workspace with staff-appropriate navigation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A staff-only user can open a dedicated Staff dashboard from the authenticated account shell.
- [x] #2 The Staff dashboard lists hackathons where the current actor has staff access and opens each item into the account-scoped hackathon workspace on a staff-appropriate tab.
- [x] #3 Shell navigation and profile-menu navigation expose the Staff dashboard when the actor has staff access.
- [x] #4 Account-scoped hackathon back-navigation uses the Staff dashboard for staff users who are not navigating from an admin dashboard.
- [x] #5 Automated tests cover the new staff dashboard access and navigation behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a dedicated `/account/staff` dashboard route and a matching route guard that allows actors with hackathon staff access, following the existing judge dashboard structure.
2. Build the staff dashboard list from the caller's account hackathons, filtered to hackathons where the actor has staff visibility, and link each item into `/account/hackathons/:slug?tab=participants`.
3. Update shell navigation, the user menu, and account-hackathon back-navigation so staff users can reach and return to the Staff dashboard without being forced through admin framing.
4. Add focused automated coverage for staff dashboard access and navigation behavior.
5. Run `bun run lint`, `bun run typecheck`, and `bun run test:unit`, then finalize the task summary and checklist.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented a new `/account/staff` dashboard route with a staff-only access guard and a staff hackathon filter that respects explicit staff assignments plus admin assignments marked with `isStaff`.

Updated authenticated shell navigation, the profile menu, and account-hackathon workspace back-navigation so non-admin staff can enter and return to the new staff dashboard consistently.

Confirmed canonical docs already describe staff as a first-class hackathon actor, so no documentation changes were required.

Validation passed with `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a dedicated `Staff dashboard` at `/account/staff` so staff users now have a first-class entry point into the hackathons where they support internal operations. The page follows the existing actor-dashboard pattern, filters hackathons by canonical staff visibility rules, and opens each hackathon directly into the Participants tab for staff work.

Navigation now exposes the staff dashboard in both the authenticated shell sidebar and the profile menu, and account-scoped hackathon back-navigation routes non-admin staff users back to `/account/staff` instead of the generic account landing page. Shared navigation helpers were updated so staff-context hackathon routes keep the staff dashboard active, while admin routes still win when admin access exists.

Added focused unit coverage for staff hackathon filtering, staff shell-navigation behavior, and the staff back-link helper. Full validation passed with `bun run lint`, `bun run typecheck`, and `bun run test:unit`. No follow-up risk is recorded beyond normal UI review of the new dashboard copy and ordering in the shell navigation.
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
