---
id: TASK-4.7
title: Build the blind judge assignment and review workspace
status: Done
assignee:
  - '@Codex'
created_date: '2026-03-22 22:09'
updated_date: '2026-03-23 06:54'
labels:
  - frontend
  - ui
  - judge
  - judging
milestone: m-1
dependencies:
  - TASK-3
  - TASK-4.1
documentation:
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
parent_task_id: TASK-4
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the judge workspace so judges can review assigned submissions in the blind judging view, track assignment progress, and record canonical judging outcomes without exposing team identity.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Judges can list and open their active assignments and the review surface excludes team identity while presenting anonymized application context.
- [x] #2 Judges can start, complete, skip, and mark assignments ineligible according to the canonical judging workflow.
- [x] #3 The UI distinguishes assignment states and prevents judge actions that violate documented lifecycle or assignment guards.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Replace the placeholder `app/pages/judging/index.vue` with a judge assignment inbox that reuses `/api/session`, `/api/hackathons?page=1&page_size=100`, and per-hackathon `GET /api/hackathons/:hackathonId/judging/assignments` calls to show only blind-safe active assignments grouped by hackathon.
2. Add judge-local state and presentation helpers under `app/composables/useJudgeWorkspace.ts` and `app/utils/judging-workspace.ts` for fetch orchestration, status badges, action availability, and request payload shaping derived from the canonical `JudgeAssignment` lifecycle.
3. Add a dedicated blind-review route at `app/pages/judging/[hackathonId]/assignments/[assignmentId].vue` plus judge-local components under `app/components/judging/**` for blind submission summary, anonymized application context, rubric entry, assignment progress, and action affordances.
4. Drive the review surface with existing backend contracts only: `GET /api/hackathons/:hackathonId/judging/assignments/:assignmentId`, `GET /api/hackathons/:hackathonId/evaluation-criteria`, `POST .../actions/start`, `POST .../actions/complete`, `POST .../actions/skip`, and `POST .../actions/mark-ineligible`.
5. Keep TASK-4.7 strictly judge-scoped: do not change shared shell/navigation owned by TASK-4.1, do not touch public discovery/detail owned by TASK-4.2, and do not add admin reassignment/force-skip/setup controls owned elsewhere.
6. Enforce documented guards in the UI so judges only see valid actions for `assigned`, `judge_started`, and `judge_completed`, including the canonical rule that ineligibility is assignment-level and can be marked only from started or completed review states.
7. Add focused validation for the judge workspace only: unit coverage for judge action guard/presentation helpers and authenticated BDD coverage for listing assignments, opening blind detail, starting review, completing with criterion scores, skipping, and marking an assignment ineligible without exposing team identity.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Supervisor requested explicit plan handoff. No implementation is approved until the worker sends a concise discovery brief plus backlog-backed plan for approval.

Implemented the judge workspace entirely in judge-local files: `/judging` is now an active blind-review inbox, and `/judging/[hackathonId]/assignments/[assignmentId]` provides the assignment detail/review surface with start, complete, skip, and mark-ineligible actions wired to the existing judging API.

Used a client-first `useFetch`/`useAsyncData` pattern in `useJudgeWorkspace.ts` so protected `/api/session` reads do not fail during the initial SSR pass before Auth0 browser state is restored. This keeps the judge pages aligned with the existing shell/account loading model and fixes authenticated BDD/browser rendering.

Added isolated judge-workspace BDD fixtures and scenarios so the new UI coverage does not race or conflict with the existing authenticated judging API scenarios that mutate the original judging assignments. Validation passed via targeted lint, `bunx vitest run tests/unit/app/utils/judging-workspace.test.ts`, `bun run typecheck`, `node --experimental-strip-types tests/bdd/bootstrap.ts`, `./node_modules/.bin/bddgen`, and `./node_modules/.bin/playwright test .features-gen/authenticated/tests/bdd/features/authenticated/judge-workspace.feature.spec.js --project chromium-authenticated-bdd`.

Independent review reopened TASK-4.7. Remaining issue before the task is clean: the judge inbox still depends on a first-page-only `/api/hackathons?page=1&page_size=100` fetch in `useJudgeWorkspace`, so active judge assignments can disappear for actors whose reviewable hackathons fall outside that first visible page. The workspace needs a real path through the paginated hackathon result set or another caller-safe way to resolve all reviewable hackathons before the task can be committed.

Review finding detail: `app/composables/useJudgeWorkspace.ts` hard-codes `GET /api/hackathons?page=1&page_size=100` with no pagination/load-more path, which conflicts with TASK-4.7 AC #1 because judges cannot reliably list all active assignments once reviewable hackathons exceed the first page.

Supervisor review outcome: no blind identity leak found in the current slice, and the action-guard rules look aligned with the documented lifecycle. The blocker is completeness of the inbox query path, not the blind-review controls themselves.

Validation note remains otherwise strong: focused judge BDD and unit coverage are in place, but the pagination/completeness gap must be fixed before the task is treated as done.

Next expected fix scope: keep the change inside TASK-4.7 judge-local files and solve the first-page-only inbox dependency without reopening shared shell/admin/public ownership.

Commit is intentionally held until the inbox-completeness issue is resolved and re-reviewed.

Worker guidance after review: fix the first-page-only inbox dependency in `useJudgeWorkspace` so judges can reliably see all active assignments even when reviewable hackathons extend beyond the first visible `/api/hackathons` page. Keep the patch judge-local and rerun focused validation before re-review.

Independent review reopened TASK-4.7. Remaining blocking issue before commit: the judge inbox is still first-page-only because `useJudgeWorkspace()` hard-codes `GET /api/hackathons?page=1&page_size=100` and never paginates/load-mores through the visible hackathon set before fetching assignments, so active assignments can disappear once relevant hackathons fall outside the first page. Blind-review identity separation and action/lifecycle guards otherwise reviewed clean.

2026-03-23: Reopened for inbox completeness. Replaced the first-page-only `/api/hackathons?page=1&page_size=100` fetch in `useJudgeWorkspace()` with paginated discovery that exhausts every visible hackathon page before filtering reviewable hackathons and loading per-hackathon assignments.

2026-03-23: Added focused unit coverage for paginated hackathon discovery and reran the judge-workspace validation set: eslint on judge-local files, `bunx vitest run tests/unit/app/utils/judging-workspace.test.ts`, `bun run typecheck`, `node --experimental-strip-types tests/bdd/bootstrap.ts`, `./node_modules/.bin/bddgen`, and the authenticated Playwright judge-workspace spec.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Built the canonical blind judge workspace for TASK-4.7 without touching shared shell/navigation ownership. Replaced the `/judging` placeholder with a live blind-review inbox that groups the current actor’s active assignments by hackathon, added judge-local presentation/state helpers, and introduced a dedicated `/judging/[hackathonId]/assignments/[assignmentId]` route for blind submission review. The detail surface keeps team identity hidden, shows anonymized application context, loads evaluation criteria, and records canonical judge actions through the existing review endpoints for start, complete, skip, and mark-ineligible.

Added judge-local components and utilities so the route logic stays focused: inbox cards, blind submission summary, status badges, rubric editing, status/ineligibility formatting, and lifecycle guard helpers. The final implementation intentionally uses client-first protected data loading to match the repository’s Auth0/browser behavior and avoid SSR-time `/api/session` failures on authenticated pages.

Added focused validation for the new workspace: unit coverage for judge action guards and score-draft helpers, plus an authenticated BDD feature that exercises the browser UI for listing blind assignments, opening detail, starting and completing a review, marking an assignment ineligible, and skipping an in-progress assignment back to the inbox. Validation passed with `bunx eslint --no-warn-ignored ...`, `bunx vitest run tests/unit/app/utils/judging-workspace.test.ts`, `bun run typecheck`, `node --experimental-strip-types tests/bdd/bootstrap.ts`, `./node_modules/.bin/bddgen`, and `./node_modules/.bin/playwright test .features-gen/authenticated/tests/bdd/features/authenticated/judge-workspace.feature.spec.js --project chromium-authenticated-bdd`.

Residual risk is limited to scope and suite breadth rather than known judge-workspace failures: this task does not cover admin-side blind reassignment/force-skip controls, and only the focused judge-workspace browser spec was run rather than the full authenticated/destructive BDD suite.

Reopen follow-up: fixed judge inbox completeness so visible hackathons beyond discovery page 1 are now included before assignment fan-out, preventing active blind reviews from disappearing when the visible hackathon set exceeds the first page.

Reopen validation: added helper coverage for paginated hackathon discovery and reran the focused judge-workspace lint, unit, typecheck, bootstrap, generated BDD, and authenticated browser workflow checks with passing results.
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
