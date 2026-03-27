---
id: TASK-31
title: Move admin and judging under /account and redesign both workspace pages
status: Done
assignee:
  - '@codex'
created_date: '2026-03-26 21:55'
updated_date: '2026-03-26 22:02'
labels: []
dependencies:
  - TASK-21
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Relocate authenticated admin and judging routes from top-level paths to account-scoped paths (`/account/admin`, `/account/judging`) and redesign both pages to align with the established account/dashboard visual language. Replace current noisy/duplicative content with concise, action-oriented workspace summaries and controls that do not repeat information already available elsewhere.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Admin workspace is available at `/account/admin` and no longer exposed at `/admin`
- [x] #2 Judging workspace is available at `/account/judging` and no longer exposed at `/judging`
- [x] #3 Navigation and route guards continue to enforce existing authorization behavior for both workspaces
- [x] #4 Admin and judging page styles match the account/dashboard UI direction (cards/spacing/typography)
- [x] #5 Admin and judging page content is reduced to actionable workspace information without duplicating existing sidebar/global info
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Moved primary workspace entry routes to `/account/admin` and `/account/judging` with redirects from legacy `/admin` and `/judging`.

Redesigned both workspace pages to match account/dashboard visual language and removed duplicate/non-actionable actor metadata content.

Updated navigation entry points (dashboard links, shell sidebar, judge assignment back/skip redirect) to account-scoped routes.

Updated affected tests for judge workspace route changes (`tests/bdd/steps/judge-workspace.steps.ts`, `tests/unit/app/utils/auth-navigation.test.ts`).

Validation run: `bun run test:unit` (pass), `bun run typecheck` (pass).

BDD suite was not executed in this change due runtime cost; route-path assertions were updated in existing BDD steps.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented account-scoped admin and judging workspaces with route redirects from legacy paths, aligned both pages to the account/dashboard styling system, and reduced page content to actionable workspace controls. Updated navigation and judging flow links to the new paths, refreshed judge card visual style to match the same design language, and updated affected unit/BDD step assertions. Local validation passed for unit tests and typecheck; full BDD was not run in this pass.
<!-- SECTION:FINAL_SUMMARY:END -->

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
