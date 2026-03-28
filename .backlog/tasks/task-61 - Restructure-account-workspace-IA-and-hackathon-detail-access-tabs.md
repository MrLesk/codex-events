---
id: TASK-61
title: Restructure account workspace IA and hackathon detail access tabs
status: In Progress
assignee:
  - '@codex'
created_date: '2026-03-28 15:48'
updated_date: '2026-03-28 16:38'
labels: []
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
  - docs/lifecycle-and-state-machines.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Rework the authenticated account workspace so navigation is page-based instead of role-swapped within shared pages. Replace the current dashboard/admin/judging information architecture with the canonical account sections requested by product: My hackathons, Profile Settings, Judge dashboard, Hackathon admin dashboard, and Platform admin dashboard. Preserve the existing product rules from the canonical docs while making access enforcement route-based for whole pages, and query-param based for hackathon-detail tabs. Minimize component count by reusing shared list/detail building blocks across the account dashboards and the public/account hackathon detail surfaces.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The account sidebar exposes My hackathons, Profile Settings, Judge dashboard, Hackathon admin dashboard, and Platform admin dashboard based on page-level permissions only, without swapping page content by role inside a shared route.
- [x] #2 My hackathons becomes the primary participant landing page, groups current participation first, upcoming/current active hackathons ahead of past hackathons, and shows an empty-state CTA to explore hackathons when the user has no participation history.
- [x] #3 Judge dashboard, Hackathon admin dashboard, and Platform admin dashboard use a shared hackathon-list surface; the judge page lists only hackathons where the actor is explicitly a judge, the hackathon-admin page lists hackathons the actor can manage, and the platform-admin page carries the global admin entry/actions that no longer belong on the hackathon-admin page.
- [x] #4 Protected account pages that the actor lacks permission to access route to a 401 experience instead of redirecting into another workspace, while unauthorized or invalid hackathon-detail tab query values fall back to the overview tab.
- [x] #5 The account hackathon detail page uses one permission-aware tab model: participants see Overview, Prizes, Details, Judges, and Staff; judges also see Judging; hackathon admins and platform admins also see Operations and Settings. Scope callouts are removed from the affected account pages.
- [x] #6 Relevant navigation/helper/UI tests are updated for the new account IA and tab behavior, and validation is run locally with at least bun run test:unit.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approved implementation plan:
1. Replace the account landing model with `/account` as the canonical My hackathons page, update auth/navigation helpers and all internal callers to use the new canonical account entry points, and remove redirect-style compatibility routes rather than preserving them.
2. Refactor shell navigation in `app/composables/useShellNavigation.ts` and related account/user-menu labels so the sidebar exposes only the requested page set: My hackathons, Profile settings, Judge dashboard, Hackathon admin dashboard, and Platform admin dashboard, each hidden or shown strictly by page-level permission.
3. Add page-level permission enforcement without redirects by updating navigation guards and middleware to throw a 401 experience for denied account pages; keep login redirects only for unauthenticated access, not for authenticated-but-unauthorized actors.
4. Rework `/account` into a participant-only My hackathons page using the participation workspace data, grouped into active, upcoming, and past sections with an empty-state explore CTA; keep Profile Settings behavior but rename the page title and copy to Profile settings.
5. Rebuild `/account/judging`, `/account/admin`, and new `/account/platform-admin` around a shared hackathon-list/dashboard surface. The judge page will list only explicit judge hackathons, the hackathon-admin page will list manageable hackathons, and the platform-admin page will carry global platform-admin controls plus the same reusable list pattern.
6. Collapse hackathon-specific admin workspace routing into the canonical account hackathon detail page at `/account/hackathons/[slug]` using query-param tabs. Reuse public/detail components for shared overview, prizes, and details content; expose Judges and Staff base tabs for authenticated account viewers; add Judging only for explicit judges; add Operations and Settings only for hackathon admins/platform admins; and fall back invalid or unauthorized tab query values to `overview`.
7. Remove the old admin subroute pages and other affected redirect aliases from the route tree so the repository only serves the new canonical IA.
8. Update unit and BDD coverage for auth navigation, sidebar visibility, permission helpers, session landing expectations, and the new tab-selection behavior, then run at least `bun run test:unit`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Discovery notes: the current account IA is split across `/account/dashboard`, `/account/judging`, `/account/admin`, and `/account/settings`, with sidebar visibility built in `app/composables/useShellNavigation.ts` and shared shell rendering in `app/layouts/profile.vue`.

The current shell already supports page-level sidebar hiding, but `/account/dashboard` and `/account/admin` still switch content based on role-derived access flags inside the page body rather than exposing separate canonical pages.

Hackathon detail tabs already use query-param selection helpers (`app/utils/tab-query.ts`) on both `app/pages/hackathons/[slug]/index.vue` and `app/pages/account/hackathons/[slug]/index.vue`, so tab gating can be kept route-local without adding subroutes.

Route guards currently redirect unauthorized users back into another workspace or the public hackathon detail (`app/utils/navigation-guards.ts`, `app/middleware/require-platform-admin.ts`) and there is no dedicated 401 route yet.

Judge and staff rosters are not currently exposed by a public/account read model. The existing account hackathon detail page already uses placeholder panels for those tabs.

Implemented the canonical account IA without redirect compatibility routes. `/account` is now My hackathons; `/account/settings` is Profile settings; `/account/judging`, `/account/admin`, and `/account/platform-admin` are separate permission-gated pages with a shared dashboard list surface.

Replaced authenticated-but-unauthorized redirects with 401 errors via route middleware/guard helpers and a shared `error.vue` unauthorized experience. Invalid or unauthorized account hackathon `?tab=` values now normalize back to the allowed tab set with `overview` as the fallback.

Collapsed hackathon-specific admin subroutes into `/account/hackathons/[slug]`, added permission-aware tabs, removed scope callouts from the affected account pages, and deleted obsolete alias/admin subroute pages rather than preserving backward-compatibility routes.

Validation: `bun run test:unit` passed locally (38 files, 180 tests). `bun run typecheck` still fails in unrelated existing worktree changes in `app/components/public/hackathons/HackathonTimeline.vue`, `server/api/hackathons/[hackathonId]/applications/actions/apply-staged-decisions.post.ts`, and `server/api/hackathons/[hackathonId]/applications/index.post.ts`.

Follow-up scope change applied: removed the separate platform-admin dashboard route and entry entirely. The canonical admin surface is now `/account/admin` labeled `Admin dashboard`, with platform-admin-only controls rendered inside that page via role checks.

Adjusted the public hackathon detail CTA so that once registration is closed, actors who can already access the hackathon from `/account/hackathons/:slug` still see the same header action placement and styling, now labeled `Open workspace` instead of losing the CTA entirely. Implementation uses `/api/account/hackathons` as the canonical account-visibility check rather than duplicating role and application rules in the page.

Validation for the public-detail CTA follow-up: `bun run test:unit` passed locally after the final diff (39 files, 185 tests).
<!-- SECTION:NOTES:END -->

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
