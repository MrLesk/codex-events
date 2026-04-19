---
id: TASK-285.3
title: Add feedback results to the account hackathon workspace
status: Done
assignee: []
created_date: '2026-04-19 20:02'
updated_date: '2026-04-19 20:25'
labels: []
dependencies:
  - TASK-285.1
documentation:
  - docs/permissions-matrix.md
  - docs/api-surface.md
parent_task_id: TASK-285
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a new `Feedback` tab to the account hackathon workspace for hackathon admins, staff, and judges. The tab should expose the completed hackathon's feedback results in a form that is useful for post-event review, including aggregated rating results and any optional written comments.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The account workspace tab model exposes a `Feedback` tab to hackathon admins, staff, and judges, and hides it from actors without those roles.
- [x] #2 The feedback tab loads feedback data for the current hackathon and shows aggregated per-question results in a way that is easy to scan.
- [x] #3 Optional written comments are visible in the feedback tab with enough context for internal review without exposing unrelated participant-only workspace state.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added a `Feedback` tab to the account hackathon workspace for judges, staff, and admins only, along with an internal results API and a new feedback results panel.

The panel shows response totals, averages, per-score distributions, and written comments while keeping participant-only workspace state separate.

Coverage includes tab and SEO unit tests plus integration coverage for role-based access to the internal feedback results endpoint; there is no separate component rendering test for the panel yet.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added internal feedback reporting to the account hackathon workspace. The tab model now exposes `Feedback` to hackathon admins, staff, and judges only, the internal `GET /api/hackathons/:hackathonId/feedback` endpoint returns hackathon-scoped aggregates and comments, and the new workspace panel shows total responses, per-question averages, score distributions, and written feedback in a scan-friendly layout. Added unit coverage for tab and SEO wiring plus integration coverage for judge, staff, and admin access to the results endpoint. No separate component rendering test was added for the results panel.
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
