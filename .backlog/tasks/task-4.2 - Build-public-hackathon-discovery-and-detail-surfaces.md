---
id: TASK-4.2
title: Build public hackathon discovery and detail surfaces
status: Done
assignee:
  - Hegel
created_date: '2026-03-22 22:09'
updated_date: '2026-03-23 00:36'
labels:
  - frontend
  - ui
  - public
milestone: m-1
dependencies:
  - TASK-3
documentation:
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
  - docs/design-reference.md
parent_task_id: TASK-4
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the public and authenticated hackathon discovery experience so users can find programs, inspect details, and understand timeline, criteria, prizes, and current terms context before applying, joining, judging, or administering a hackathon.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The UI provides a hackathon list experience that surfaces canonical discovery information and current lifecycle state.
- [x] #2 The hackathon detail experience presents canonical fields, timeline context, evaluation criteria, prizes, and current terms references appropriate to the viewer.
- [x] #3 The public detail surface does not expose restricted operational data reserved for admins, judges, team members, or approved users.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Build public routes at `app/pages/hackathons/index.vue` and `app/pages/hackathons/[hackathonId].vue` without touching shared shell or navigation files owned by TASK-4.1.
2. Add task-local public UI components under `app/components/public/**` for hackathon cards, lifecycle badges, timeline context, criteria, prizes, and current terms references so the route files stay focused.
3. Implement list page data loading from `GET /api/hackathons` and surface canonical discovery fields plus lifecycle state using only public-safe data returned by the backend.
4. Implement detail page data loading from `GET /api/hackathons/:hackathonId`, `GET /api/hackathons/:hackathonId/evaluation-criteria`, and `GET /api/hackathons/:hackathonId/prizes`, presenting canonical public-safe fields only.
5. Keep terms presentation limited to current terms references from the hackathon detail response rather than the authenticated full-terms endpoint.
6. Add focused BDD coverage for public hackathon discovery and detail, extending shared fixtures only as much as needed to expose visible criteria, prizes, and term references on a public hackathon.
7. Run targeted validation for the changed frontend and BDD surface, then finalize TASK-4.2 with acceptance criteria, notes, and summary if the implementation is complete.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented a public `/hackathons` list page and `/hackathons/[hackathonId]` detail page using only public-safe backend contracts: `GET /api/hackathons`, `GET /api/hackathons/:hackathonId`, `GET /api/hackathons/:hackathonId/evaluation-criteria`, and `GET /api/hackathons/:hackathonId/prizes`.

Added task-local public presentation components plus shared presentation helpers so the list/detail routes stay focused and do not touch shared shell or navigation files owned by TASK-4.1.

Validation for TASK-4.2 passed through focused checks: `bunx eslint --no-warn-ignored app/composables/useHackathonPresentation.ts tests/bdd/steps/public-hackathons.steps.ts tests/bdd/support/platform-fixtures.ts`, `node --experimental-strip-types tests/bdd/bootstrap.ts`, `./node_modules/.bin/bddgen`, and `./node_modules/.bin/playwright test .features-gen/public/tests/bdd/features/public/hackathon-discovery.feature.spec.js --project chromium-bdd`. Full-repo `bun run typecheck` is currently blocked by unrelated concurrent errors in `app/pages/onboarding/account.vue` outside TASK-4.2.

Independent review found follow-up fixes before TASK-4.2 can be treated as clean: keep `/hackathons` on a public-safe visibility contract even for authenticated admins, switch public detail URLs to slug-oriented routing instead of opaque internal IDs, and correct `max team members` wording so the UI does not overstate capacity.

Applied the independent-review fixes: the public `/hackathons` surface now filters draft hackathons locally so authenticated admin sessions still see a public-safe result set, public detail routing now resolves by slug (`/hackathons/[slug]`) instead of exposing opaque internal IDs, and team-capacity copy now uses the canonical `Maximum X team members` wording.

Reran focused validation after the review fixes: `bunx eslint --no-warn-ignored app/composables/useHackathonPresentation.ts tests/bdd/steps/public-hackathons.steps.ts tests/bdd/support/platform-fixtures.ts`, `node --experimental-strip-types tests/bdd/bootstrap.ts`, `./node_modules/.bin/bddgen`, and `./node_modules/.bin/playwright test .features-gen/public/tests/bdd/features/public/hackathon-discovery.feature.spec.js --project chromium-bdd` all passed. The Playwright run now covers anonymous discovery, privileged-session public discovery, and slug-based public detail navigation.

Second-review follow-up fixes moved the public discovery/detail UI onto a dedicated public backend contract. Added `/api/public/hackathons` for caller-independent public discovery plus exact-slug public detail, criteria, and prize reads under `/api/public/hackathons/:slug/**`, then switched the `/hackathons` pages to those endpoints so authenticated admins no longer lose public hackathons when drafts consume caller-visible list slots.

Added regression coverage for the reported failure modes in `tests/integration/server/api/hackathon-routes.test.ts`: authenticated-admin requests to the public list still return the full public-safe result set even when draft hackathons fill the caller-visible page window, and exact slug detail resolution succeeds without relying on fuzzy paginated lookup. Updated the public BDD scenario to confirm the platform-admin session still sees the visible fixture hackathon while the draft fixture remains hidden.

Reran focused validation after the second-review fixes: `bunx eslint --no-warn-ignored app/composables/useHackathonPresentation.ts app/pages/hackathons/index.vue app/pages/hackathons/[slug].vue server/utils/hackathon-management.ts server/api/public/hackathons/index.get.ts server/api/public/hackathons/[slug]/index.get.ts server/api/public/hackathons/[slug]/evaluation-criteria/index.get.ts server/api/public/hackathons/[slug]/prizes/index.get.ts tests/integration/server/api/hackathon-routes.test.ts tests/bdd/features/public/hackathon-discovery.feature tests/bdd/steps/public-hackathons.steps.ts`, `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/hackathon-routes.test.ts`, `node --experimental-strip-types tests/bdd/bootstrap.ts`, `./node_modules/.bin/bddgen`, and `./node_modules/.bin/playwright test .features-gen/public/tests/bdd/features/public/hackathon-discovery.feature.spec.js --project chromium-bdd` all passed.

Third independent review found two remaining issues before TASK-4.2 is clean: (1) the dedicated `/api/public/hackathons` endpoints still serialize internal-only fields through the generic hackathon serializer, and (2) the `/hackathons` UI is still first-page-only with a hard-coded `page_size=100` and no pagination/load-more path, so discovery becomes incomplete once more than 100 public hackathons exist. The caller-privilege leak and exact-slug resolution are confirmed fixed.

Reopened for final cleanup after independent review. The next patch will split a dedicated public hackathon serializer from the generic serializer so `/api/public/hackathons` no longer exposes internal term ids, creator ids, or timestamps, and will replace the first-page-only `/hackathons` fetch with an actual paginated public-discovery flow that can reach the full public result set.

Supervisor requested an explicit plan handoff before the final cleanup patch proceeds. The intended direction recorded here is acceptable in principle, but implementation approval still requires the worker to send the concise fix plan directly.

Final cleanup completed after third-review findings. Split dedicated public serializers from the generic hackathon serializer so `/api/public/hackathons` and `/api/public/hackathons/:slug/**` expose only the documented public-safe shape, including terms references without internal ids, creator ids, or audit timestamps.

Replaced the first-page-only discovery behavior with a real paginated public flow on `/hackathons`. The page now loads the first public slice from `/api/public/hackathons` and can fetch later public pages through a load-more control, so discovery remains complete past 100 visible hackathons. The public BDD step was updated to wait for Nuxt hydration before clicking the load-more control and to match page-2 requests without assuming query-parameter order.

Focused validation after the final cleanup passed: `bunx eslint --no-warn-ignored app/pages/hackathons/index.vue app/composables/useHackathonPresentation.ts tests/bdd/steps/public-hackathons.steps.ts tests/bdd/support/platform-fixtures.ts tests/integration/server/api/hackathon-routes.test.ts server/utils/hackathon-management.ts server/api/public/hackathons/index.get.ts server/api/public/hackathons/[slug]/index.get.ts server/api/public/hackathons/[slug]/evaluation-criteria/index.get.ts server/api/public/hackathons/[slug]/prizes/index.get.ts docs/api-surface.md`, `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/hackathon-routes.test.ts`, `node --experimental-strip-types tests/bdd/bootstrap.ts`, `./node_modules/.bin/bddgen`, and `./node_modules/.bin/playwright test .features-gen/public/tests/bdd/features/public/hackathon-discovery.feature.spec.js --project chromium-bdd`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented the canonical public hackathon discovery surface for the UI milestone. Added a dedicated `/hackathons` list page and `/hackathons/[hackathonId]` detail page, backed by task-local public components for lifecycle badges, timeline context, criteria, prizes, and current terms references. The detail page intentionally stays within the public contract defined in `docs/`: it shows public program fields, timing, evaluation criteria, prize definitions, and current terms references without exposing admin, judge, team, or other restricted operational data.

To protect the new surface, added focused public BDD coverage for both hackathon list and detail flows and extended the shared fixture dataset with visible public criteria, a public prize definition, and current terms references on the fixture hackathon. Validation for this task passed through focused lint and public BDD execution. Residual risk is limited to concurrent repository work outside this task: full-repo `bun run typecheck` currently fails in the onboarding/account area being developed in parallel, so reviewers should evaluate TASK-4.2 using the targeted validation evidence recorded in the task notes.

Independent review follow-up fixes are now incorporated. The public list page no longer reflects caller-privileged draft visibility even when an authenticated platform admin opens it, public detail URLs are slug-oriented rather than internal-ID oriented, and the UI now uses the canonical `Maximum X team members` wording. Focused lint and public BDD validation were rerun after those fixes and passed, so TASK-4.2 is ready for a second review.

A narrow backend enhancement now protects the public UI contract directly. Public discovery and detail reads use dedicated caller-independent endpoints under `/api/public/hackathons`, with exact slug resolution for detail, criteria, and prize reads. That removes the previous dependency on caller-visible admin data, so authenticated admins see the same complete public-safe list as anonymous visitors and public detail no longer depends on fuzzy paginated slug lookup. Focused integration and BDD validation passed after these changes, so TASK-4.2 is ready for a third review.

Final review fixes are now in place. The dedicated public contract no longer reuses internal serializers, so public discovery/detail/criteria/prize responses expose only the documented public-safe fields. `/hackathons` also now has a real paginated path through the public result set instead of a first-page-only fetch, with regression coverage proving later public hackathons remain reachable and visible after loading more results.

Focused integration and public BDD validation passed after these changes. This resolves the remaining public-shape leak and incomplete-discovery findings, so TASK-4.2 is clean and ready for another independent review if needed.
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
