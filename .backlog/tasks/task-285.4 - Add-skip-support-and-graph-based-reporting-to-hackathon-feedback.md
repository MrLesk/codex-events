---
id: TASK-285.4
title: Add skip support and graph-based reporting to hackathon feedback
status: Done
assignee:
  - '@codex'
created_date: '2026-04-20 17:03'
updated_date: '2026-04-20 17:20'
labels: []
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/schema-outline.md
  - docs/api-surface.md
  - docs/permissions-matrix.md
parent_task_id: TASK-285
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the participant-facing hackathon feedback flow so respondents can explicitly mark a question as `Not applicable` when they did not directly experience that area. The feedback model, public submission form, and internal feedback reporting must treat skipped answers differently from rated answers. The internal results view should also move away from a count-only display toward a graph-based presentation that makes rating distribution easier to understand at a glance while still showing exact counts where useful.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Each participant-facing feedback question includes an explicit `Not applicable` option, and submissions can persist skipped answers without forcing a 1-5 rating.
- [x] #2 Feedback summaries exclude `Not applicable` answers from averages, report skipped-answer counts separately, and keep exact counts available for internal review.
- [x] #3 The account hackathon feedback tab presents each question with a clearer graph-based distribution view plus supporting counts so organizers can understand response patterns at a glance.
- [x] #4 Canonical docs and relevant automated tests are updated for the new skip semantics and reporting behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the shared feedback model, database schema, and migration so each question can persist either a `1..5` rating or an explicit `Not applicable` skip.
2. Update the public feedback form to let participants choose `Not applicable` on every question and submit explicit skips without leaving questions unanswered.
3. Update feedback summarization and the internal results panel so averages exclude skipped answers and the report shows graph-based distributions plus exact counts.
4. Extend canonical docs and automated tests for nullable feedback answers, skip-aware summaries, and the updated results view.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added `Not applicable` support end-to-end by allowing nullable feedback ratings in the schema and migration, accepting explicit null answers in the submission payload, and updating the participant form to treat skipped answers as valid responses.

Changed feedback summaries so averages use rated answers only, each question reports rated and skipped counts separately, and the admin panel now renders horizontal distribution bars with exact counts and percentages instead of the previous box grid.

Validation passed with `bun run lint`, `bun run typecheck`, `bun run test:unit`, plus targeted integration coverage for `tests/integration/server/database/migration.test.ts` and `tests/integration/server/api/hackathon-routes.test.ts`. The only remaining lint output is the pre-existing `vue/no-v-html` warning in `app/components/admin/AdminCompetitionPrizeRedemptionsPanel.vue`.

Adding question-level client-side validation to highlight unanswered feedback questions and align the public form with existing field-error patterns.

Public feedback form now highlights unanswered questions client-side with inline "Choose a rating or Not applicable." messages and error-state borders on the unanswered response controls, matching the required-field pattern used in other forms.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added explicit skip support and clearer reporting to hackathon feedback. Participants can now answer every question with either a `1..5` score or `Not applicable`, and the backend stores skipped answers as null ratings without losing anonymity or changing route access rules. Internal feedback summaries now exclude skipped answers from averages, expose rated and `Not applicable` counts separately, and the account feedback tab uses bar-based distribution rows with counts and percentages so organizers can read results at a glance. Updated canonical docs, added the nullable feedback migration, and extended unit and integration coverage for skip-aware submission and reporting behavior.

Follow-up polish aligned the public feedback form with the rest of the product's client-side validation by showing exactly which questions still need a response before submit.
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
