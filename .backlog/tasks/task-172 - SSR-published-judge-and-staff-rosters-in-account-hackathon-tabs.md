---
id: TASK-172
title: SSR published judge and staff rosters in account hackathon tabs
status: Done
assignee:
  - '@codex'
created_date: '2026-04-03 19:54'
updated_date: '2026-04-03 19:57'
labels:
  - account-workspace
  - judges
  - staff
  - ssr
dependencies: []
references:
  - 'app/pages/account/hackathons/[slug]/index.vue'
  - app/components/account/hackathons/AccountHackathonPublishedRosterPanel.vue
  - app/utils/hackathon-published-roster.ts
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Prefetch the published judge and staff roster payloads for non-admin account hackathon workspace users so the Judges and Staff tabs do not render a transient client-side loading or empty state before roster data arrives. Keep the existing admin role-roster panels unchanged.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Judges and Staff published roster tabs receive their initial roster data from the account hackathon page SSR bootstrapping for non-admin workspace users.
- [x] #2 Switching between Overview, Judges, and Staff tabs in `/account/hackathons/:slug` does not show the published-roster loading state before the roster data is available.
- [x] #3 Admin users keep the existing role-roster management panels and do not depend on the published roster SSR payload path.
- [x] #4 Relevant tests cover the new roster data path or component contract and validation commands pass.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Confirmed the current flash came from `AccountHackathonPublishedRosterPanel` owning its own `useFetch`. Query-only tab navigation reuses the page instance, so the child panel would fetch on the client and briefly render its loading or empty state before roster data arrived.

Implemented published roster prefetching in the account hackathon page bootstrapping for non-admin workspace users by loading both roster payloads alongside the existing SSR page data. The published-roster panel is now presentational and renders a supplied roster state instead of fetching on mount.

Used a small helper in `app/utils/hackathon-published-roster.ts` to normalize the SSR roster load result and error handling so the new page-level data path has direct unit coverage without introducing a new component-test harness.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Prefetched the published judge and staff rosters in the account hackathon page setup for non-admin workspace users, so the `Judges` and `Staff` tabs no longer depend on a child-level client fetch and no longer flash a loading or wrong empty state before data arrives.

`AccountHackathonPublishedRosterPanel` is now a presentational component that renders a supplied roster state, while the page continues to keep admin-only role-roster panels unchanged. A new helper in `app/utils/hackathon-published-roster.ts` normalizes the SSR roster load result and error handling, and unit coverage was added there.

Validation passed with `bun run lint`, `bun run typecheck`, `bun run test:unit`, and `bunx vitest run tests/unit/app/utils/hackathon-published-roster.test.ts`.
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
