---
id: TASK-4.1
title: 'Establish the UI shell, navigation, and role-aware entry points'
status: Done
assignee:
  - Codex
created_date: '2026-03-22 22:09'
updated_date: '2026-03-23 00:23'
labels:
  - frontend
  - ui
  - shell
milestone: m-1
dependencies:
  - TASK-3
documentation:
  - docs/domain-model.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
  - docs/design-reference.md
  - docs/tech-stack.md
parent_task_id: TASK-4
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the canonical application shell so signed-out users, participants, judges, hackathon admins, and platform admins can enter the product through navigation and landing surfaces that expose only the workflows they are allowed to use. This gives the frontend a stable frame for the rest of the UI milestone and makes role-specific product areas discoverable.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The signed-out experience exposes public hackathon discovery and authentication entry points without exposing authenticated-only workflows.
- [ ] #2 Authenticated users see navigation and dashboard entry points that reflect their effective platform and hackathon roles.
- [ ] #3 The application shell supports moving between the public, participant, judge, admin, account, and winner-facing surfaces defined in the canonical docs.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a shell-local actor and capability composable that loads `/api/session` and derives navigation groups and dashboard entry cards from canonical actor state, platform-admin status, and hackathon-role assignments.
2. Replace the starter frame in `app/app.vue` with a responsive application shell: public top navigation for signed-out users, authenticated header and sidebar variants for users with a platform account, and onboarding-aware framing for authenticated identities without a platform account.
3. Refactor `app/pages/index.vue` into the signed-out public landing surface that exposes hackathon discovery and sign-in while keeping authenticated-only workflows out of the public view.
4. Refactor `app/pages/dashboard.vue` into the role-aware entry hub that surfaces only the allowed next steps for participant, judge, admin, account, and winner-facing areas, using thin links into other task-owned routes.
5. Add only the minimal shell-owned route scaffolding needed to avoid dead ends for shared entry points that do not yet have owner pages, while leaving deep feature implementation to the downstream tasks.
6. Add targeted validation for shell behavior around signed-out vs authenticated entry points and actor-aware dashboard rendering, then finalize the task once the shared surfaces and navigation rules are stable.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Supervisor note: worker assignment pending. Shared shell and navigation changes are reserved for this task to minimize conflicts with other Milestone 1 UI work.

Supervisor is handling replacement planning for the shared shell task after the initial worker stalled. No implementation has been approved yet.

Supervisor took over implementation locally after two stalled shell workers. Shared shell work is proceeding in the owned files only: app/app.vue, app/pages/index.vue, app/pages/dashboard.vue, shell-local components/composables, auth route middleware, and thin scaffolding for still-unowned shared entry points.

Implemented the shared shell locally with a role-aware header/sidebar frame in `app/app.vue`, a shell-specific navigation derivation composable in `app/composables/useShellNavigation.ts`, refreshed public and dashboard surfaces, and thin protected scaffolding for `/judging` and `/prize-redemptions`. Validation so far: `bun run typecheck` and targeted ESLint on the shell files both pass. Updated the existing public-homepage BDD expectation to match the new shell copy and public navigation.

Addressed independent review findings by restoring the `Dashboard` heading expected by the authenticated-session BDD and clearing the shell actor async-data cache on authenticated-subject changes. Follow-up validation passed with `bun run typecheck`, targeted ESLint on the shell files, and `bunx playwright test tests/bdd/features/authenticated/authenticated-session.feature --project chromium-authenticated-bdd`.

Addressed the second review round by adding a mobile header navigation rail for non-desktop users, limiting winner-facing prize-redemption entry points to accounts that actually have pending redemption tasks, and requiring pending redemption work to open the shell-owned `/prize-redemptions` scaffold. Follow-up validation passed with `bun run typecheck`, targeted ESLint on shell files, `bunx playwright test tests/bdd/features/public/public-homepage.feature --project chromium-bdd`, and `bunx playwright test tests/bdd/features/authenticated/authenticated-session.feature --project chromium-authenticated-bdd`.

Addressed the latest independent review finding by surfacing `/api/prize-redemptions/me` upstream errors instead of collapsing them into the shell-owned 404 path, and by exposing a dashboard warning when prize-redemption status cannot be loaded so winner-facing entry points no longer fail silently on backend errors.

UI automation gap remains documented for the winner-facing shell branch. I attempted a focused authenticated BDD feature for dashboard/link and route gating, but the shared outcomes/authenticated fixture flow that would create deterministic pending prize redemptions is currently failing in this worktree outside the shell slice, so I am keeping the shell fix and recording the gap instead of landing a flaky shell-owned scenario.

Follow-up validation for the shell fix: targeted ESLint on `app/composables/useShellNavigation.ts`, `app/pages/dashboard.vue`, and `app/pages/prize-redemptions/index.vue` passed; `bunx playwright test tests/bdd/features/authenticated/authenticated-session.feature --project chromium-authenticated-bdd` passed. Full `bun run typecheck` is still blocked by concurrent TASK-4.8 admin-workspace errors outside TASK-4.1.

Final independent review returned no findings on the current TASK-4.1 slice. Residual risk remains limited to the documented winner-path UI automation gap, which depends on a shared outcomes/authenticated fixture flow outside TASK-4.1 rather than on additional shell defects.

Repository-wide `bun run typecheck` is now green again after concurrent admin-workspace fixes landed, so the latest TASK-4.1 validation evidence is: targeted ESLint on the shell files, `bunx playwright test tests/bdd/features/authenticated/authenticated-session.feature --project chromium-authenticated-bdd`, and full `bun run typecheck` all passing.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Final review found no remaining shell/navigation issues. The current implementation now surfaces upstream prize-redemption status failures explicitly instead of converting them into false 404s or silent navigation removal, while keeping the winner-path UI automation gap documented until the shared outcomes fixture flow is stable enough to support a deterministic shell-owned BDD scenario.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Canonical docs were updated or confirmed unchanged
- [ ] #2 Code behavior matches canonical docs
- [ ] #3 Relevant validation commands pass
- [ ] #4 Tests were added or updated when behavior changed
- [ ] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [ ] #7 Auth and permissions changes follow the documented platform model
- [ ] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
