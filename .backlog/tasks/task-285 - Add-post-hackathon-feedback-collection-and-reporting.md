---
id: TASK-285
title: Add post-hackathon feedback collection and reporting
status: Done
assignee:
  - codex
created_date: '2026-04-19 20:01'
updated_date: '2026-04-19 20:25'
labels: []
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/schema-outline.md
  - docs/api-surface.md
  - docs/permissions-matrix.md
  - docs/tech-stack.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a canonical post-hackathon feedback feature for completed hackathons. The public hackathon area exposes an unlinked `/hackathons/:slug/feedback` route where respondents can submit anonymous feedback for that hackathon. The form is available only when the hackathon state is `completed`, uses the existing 1-5 judging-style score selector for every rating question, and includes one optional free-text comment. Feedback is hackathon-scoped, rate-limited with Cloudflare-backed per-IP throttling, and reported in a new `Feedback` tab in the account hackathon workspace that is visible to hackathon admins, staff, and judges.

Current agreed rating topics:
- Food
- Staff
- Organization
- Platform
- Judges
- Venue
- Participants and community
- Communication before the hackathon
- Communication during the hackathon
- Clarity and fairness of the rules
- Overall experience
- Schedule and pacing
- Technical setup
- Safety, accessibility, and inclusion
- Outcomes
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Completed hackathons expose an unlinked public `/hackathons/:slug/feedback` route that allows anonymous feedback submission with a 1-5 rating for each agreed topic plus one optional comment.
- [x] #2 Feedback submissions are persisted per hackathon and protected by Cloudflare-backed per-IP rate limiting so repeated submissions are throttled.
- [x] #3 The account hackathon workspace exposes a `Feedback` tab to hackathon admins, staff, and judges, and the tab shows the submitted feedback results for that hackathon.
- [x] #4 Canonical product docs and API/schema documentation are updated to describe the feedback model, route availability, access rules, and result visibility.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Implement TASK-285.1 first: define the canonical hackathon feedback model in docs, add persistence and validation, add the public submission endpoint, and apply Cloudflare-backed per-IP throttling for anonymous submissions.
2. Implement TASK-285.2 next: add the unlinked public `/hackathons/:slug/feedback` route and a dedicated feedback form component that follows the public hackathon page shell and reuses the existing 1-5 judging-style score selector pattern.
3. Implement TASK-285.3 last: add a `Feedback` tab to the account hackathon workspace for admins, staff, and judges, then build a results panel that shows per-question aggregates, total response count, and optional written comments.
4. Add or update unit, integration, and BDD coverage for the new routing, access, submission, and reporting behavior.
5. Run `bun run lint`, `bun run typecheck`, and `bun run test:unit` before handoff, and note any additional test coverage or remaining risks in the task summary.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-04-19: Confirmed product decisions with the user: anonymous public feedback at `/hackathons/:slug/feedback`, available only when the hackathon state is `completed`, one optional free-text comment in addition to 1-5 ratings, and Cloudflare-backed per-IP throttling for repeated submissions. Discovery found strong local analogs in the public hackathon pages, `JudgeReviewRubric.vue` for the 1-5 selector UI, `account-hackathon-tabs.ts` for workspace tab access, and `server/utils/rate-limit.ts` for Cloudflare rate limiting.

Delivered the full post-hackathon feedback feature across canonical docs, database schema, public submission, internal reporting, and Cloudflare-backed throttling.

Validation passed with `bun run lint`, `bun run typecheck`, and `bun run test:unit`; targeted integration coverage for `tests/integration/server/api/hackathon-routes.test.ts` also passed after wiring the new public and internal feedback routes.

Remaining test gap: there is not yet dedicated browser or BDD automation for the new public feedback page or the internal feedback results panel.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a complete post-hackathon feedback workflow for completed hackathons. Participants can now submit anonymous feedback at the unlinked public `/hackathons/:slug/feedback` route using the agreed 1-5 question set plus an optional comment, with Cloudflare-backed per-IP throttling protecting repeated submissions. Internal actors now get a new `Feedback` tab in the account hackathon workspace that shows totals, per-question averages, score distributions, and written comments for that hackathon. The implementation also adds the canonical feedback entity, database migration, shared question definitions, public and internal API routes, route-access rules, and docs updates across the domain model, schema outline, API surface, and permissions matrix. Validation passed with `bun run lint`, `bun run typecheck`, `bun run test:unit`, and targeted integration coverage for the feedback routes. Remaining gap: there is no dedicated BDD or browser-level automation yet for the new public or internal feedback screens.
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
