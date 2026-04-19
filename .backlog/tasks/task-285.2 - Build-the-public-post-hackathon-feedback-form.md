---
id: TASK-285.2
title: Build the public post-hackathon feedback form
status: Done
assignee: []
created_date: '2026-04-19 20:02'
updated_date: '2026-04-19 20:25'
labels: []
dependencies:
  - TASK-285.1
documentation:
  - docs/domain-model.md
  - docs/api-surface.md
parent_task_id: TASK-285
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add the unlinked public `/hackathons/:slug/feedback` route and participant-facing submission flow for completed hackathons. The page should follow the existing public hackathon visual language, reuse the 1-5 judging-style score selector UI for each rating topic, collect the optional free-text comment, and show clear success and error states.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The public hackathon area includes an unlinked `/hackathons/:slug/feedback` route that loads the target hackathon, matches the surrounding public hackathon page style, and is available only when the hackathon is completed.
- [x] #2 Every agreed feedback topic is rendered as a required 1-5 rating using the existing judging-style score selector pattern, and the form includes one optional comment field.
- [x] #3 Submitting valid feedback shows clear success feedback, while validation, rate-limit, and unavailable-state failures show actionable error feedback without leaving the page.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Built the public `/hackathons/:slug/feedback` page and form using the existing public hackathon shell and the judging-style 1-5 score selector pattern.

The page stays unlinked, only resolves completed hackathons, keeps success inline, and shows validation, rate-limit, and unavailable-state failures without navigation.

No dedicated browser or BDD automation was added for the public form; current coverage is provided by shared validation tests, route integration tests, lint, and typecheck.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Built the unlinked public `/hackathons/:slug/feedback` experience for completed hackathons. The new page follows the public hackathon visual shell, renders every agreed feedback topic as a required 1-5 selector using the existing judging-style interaction pattern, includes one optional comment field, and keeps success plus error feedback inline on the page. This subtask reuses the canonical backend validation and rate limiting added in TASK-285.1. No dedicated browser-level automation was added for the page yet; current confidence comes from the shared backend tests, lint, and typecheck.
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
