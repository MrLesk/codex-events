---
id: TASK-7
title: Fix Bun dev shell warnings and add guardrails
status: Done
assignee:
  - codex
created_date: '2026-03-24 16:38'
updated_date: '2026-03-24 16:46'
labels: []
dependencies: []
references:
  - /Users/alex/projects/codex-hackathons/app/app.vue
  - /Users/alex/projects/codex-hackathons/app/pages/index.vue
  - /Users/alex/projects/codex-hackathons/app/pages/dashboard.vue
  - /Users/alex/projects/codex-hackathons/app/composables/useShellNavigation.ts
  - /Users/alex/projects/codex-hackathons/middleware/require-auth.ts
documentation:
  - /Users/alex/projects/codex-hackathons/DEVELOPMENT.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Remove the current `bun run dev` runtime warnings caused by unresolved shell component references and internal-router handling of Auth0 login endpoints. Keep the shell behavior unchanged from a user perspective, but make the component references and auth redirect path explicit enough that the dev server loads cleanly and the same mistakes are harder to reintroduce.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `bun run dev` can serve the homepage without unresolved component warnings for the shell navigation or dashboard entry card components.
- [x] #2 The shell and protected-route auth redirects no longer produce Vue Router warnings for `/auth/login?returnTo=...` during normal local page loads.
- [x] #3 The implementation follows an explicit reusable pattern for Auth0 login navigation instead of repeating raw `/auth/login` string redirects in multiple places.
- [x] #4 At least one validation step beyond manual inspection exists to reduce the chance of these warnings returning, and the contributor-facing guidance or task notes record that guardrail.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Fix the shell component warnings by aligning the template references with the actual Nuxt auto-import names for components under `app/components/shell/`, or by making those imports explicit if that is clearer and more stable.
2. Introduce one reusable auth-login helper/composable that builds `/auth/login?returnTo=...` and always routes there as an external navigation target.
3. Replace the current open-coded `/auth/login` redirects in the shell and auth middleware/page guards with that helper.
4. Validate by starting `bun run dev`, requesting `/`, and checking that the previous unresolved-component and `/auth/login` router warnings are gone.
5. Add a lightweight guardrail with focused validation for the auth-login helper and record in task notes why static checks missed the issue.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Explicitly imported the shell components used by `app.vue`, the homepage, and the dashboard so the shell no longer relies on ambiguous nested component auto-import names.

Added `app/utils/auth-navigation.ts` for canonical Auth0 endpoint URLs and `app/utils/auth-guards.ts` for the reusable protected-route navigation guard.

Replaced repeated inline `/auth/login?returnTo=...` page guards with `requireAuthNavigationGuard` and kept `middleware/require-auth.ts` as a thin wrapper around the same helper.

Marked Auth0 endpoint links as external in shell UI surfaces and public sign-in buttons so Vue Router no longer tries to resolve `/auth/login` and `/auth/logout` as app routes.

Renamed duplicated admin-only exports in `app/utils/admin-workspace.ts` to remove Nuxt auto-import collisions (`formatAdminJudgeAssignmentStatus`, `AdminTeamDetailRecord`).

Static checks missed the original warnings because nested component auto-import naming and router treatment of string URLs are runtime concerns. Added a focused unit test for the shared auth URL helper and used `bun run dev` plus an actual homepage request as the runtime validation guard.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Removed the `bun run dev` shell warnings by fixing both the shell component resolution path and the Auth0 navigation pattern. `app.vue`, the homepage, and the dashboard now import the shell components explicitly, so they no longer depend on ambiguous nested auto-import names. Auth0 endpoint generation is centralized in `app/utils/auth-navigation.ts`, and protected routes now reuse `requireAuthNavigationGuard` from `app/utils/auth-guards.ts` instead of repeating inline `/auth/login?returnTo=...` redirects.

The UI links that target Auth0 endpoints now use external navigation semantics, which stops Vue Router from warning about `/auth/login` or `/auth/logout` not being page routes. I also removed the remaining Nuxt startup noise by renaming duplicated admin-only exports in `app/utils/admin-workspace.ts` so they no longer collide with exports from `app/utils/judging-workspace.ts` and `app/utils/team-workspace.ts`.

Validation performed:
- `bun run test:unit`
- `bun run typecheck`
- `bun run dev` with `curl http://localhost:3000/` returning rendered HTML without the previous unresolved-component or `/auth/login` router warnings

Prevention note:
- These issues were runtime-only, so lint/typecheck did not catch them reliably. The new shared auth-navigation helper has focused unit coverage, and the practical guardrail for this class of problem is a lightweight dev-smoke check that boots the app and requests `/`.
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
