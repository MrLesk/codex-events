---
id: TASK-298
title: Replace dynamic IN query shapes and rerun 10000-participant load test
status: Done
assignee:
  - Codex
created_date: '2026-04-28 21:49'
updated_date: '2026-04-28 22:48'
labels:
  - performance
  - database
  - load-test
dependencies: []
modified_files:
  - server/api/account/hackathons.get.ts
  - 'server/api/hackathons/[hackathonId]/actions/start-blind-review.post.ts'
  - 'server/api/hackathons/[hackathonId]/actions/start-final-deliberation.post.ts'
  - 'server/api/hackathons/[hackathonId]/actions/start-pitch.post.ts'
  - 'server/api/hackathons/[hackathonId]/admin/credits/index.get.ts'
  - >-
    server/api/hackathons/[hackathonId]/applications/[applicationId]/actions/withdraw.post.ts
  - >-
    server/api/hackathons/[hackathonId]/applications/actions/apply-staged-decisions.post.ts
  - 'server/api/hackathons/[hackathonId]/credits/index.get.ts'
  - 'server/api/hackathons/[hackathonId]/prize-redemptions/index.get.ts'
  - 'server/api/hackathons/[hackathonId]/roles/index.get.ts'
  - >-
    server/api/public/hackathons/[slug]/published-projects/[userId]/profile-icon.get.ts
  - 'server/api/public/hackathons/[slug]/winners/[userId]/profile-icon.get.ts'
  - server/utils/application-luma-sync-queue.ts
  - server/utils/applications.ts
  - server/utils/hackathon-credits.ts
  - server/utils/hackathon-management.ts
  - server/utils/hackathon-outcome-email-queue.ts
  - server/utils/hackathon-participation.ts
  - server/utils/hackathon-photos.ts
  - server/utils/judging.ts
  - server/utils/prize-redemptions.ts
  - server/utils/shortlist.ts
  - server/utils/submissions.ts
  - server/utils/team-formation.ts
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Inventory repository IN clauses, distinguish static small-list uses from dynamic data-scale uses, replace dynamic query shapes with relational joins/subqueries or bounded direct lookups where practical, and rerun the 10000-participant local lifecycle performance test to confirm the dynamic IN paths no longer drive D1 parameter-limit failures.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Every server-side `inArray`/SQL `IN` usage is inventoried and categorized as static bounded, dynamic bounded, or dynamic data-scale.
- [x] #2 Dynamic data-scale `IN` query shapes in the hackathon lifecycle/read paths are replaced with join/subquery/direct relational query shapes so request-sized ID lists are not sent back to D1.
- [x] #3 Any remaining `IN` usages are explicitly small/static or otherwise documented as bounded exceptional cases.
- [x] #4 A 10000-participant local load test completes or produces a clear failure report after the query-shape changes.
- [x] #5 Repository validation passes with `bun run lint`, `bun run typecheck`, and `bun run test:unit` before handoff.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inventory all server-side `inArray`/SQL `IN` usage and classify each site as static bounded, dynamic bounded, or dynamic data-scale.
2. Replace dynamic data-scale reads in hackathon applications, team/submission monitoring, judging/shortlist aggregation, prize outcomes, and lifecycle actions with joins/subqueries/direct hackathon-scoped queries.
3. Keep only static enum/list `IN` predicates or clearly bounded exceptional cases; record those remaining cases in TASK-298.
4. Run targeted validation, then `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
5. Run a fresh 10000-participant local load test and summarize the report.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Inventory after removing data-scale dynamic IN query shapes:
- server/utils/platform-documents.ts:52 uses a static platform document type list.
- server/utils/platform-documents.ts:88 uses current required platform document ids, bounded by platform document types.
- server/utils/team-formation.ts:258 is a user lookup helper now limited to single-team contexts after list routes were moved to joins.
- server/utils/team-formation.ts:320 uses a static active submission status list.
- server/utils/applications.ts:249 and :326 use static active submission status lists.
- server/utils/judging.ts:1242 uses a static active judge assignment status list.
- server/utils/hackathon-management.ts:498 and :541 use hackathon track ids from settings, bounded by hackathon configuration.
- server/utils/hackathon-management.ts:789 and :1041 use a static admin/staff role list.
- server/utils/hackathon-management.ts:1184 uses current hackathon terms document ids, bounded by the configured current documents.
- server/api/hackathons/[hackathonId]/judging/assignments/index.get.ts:40 uses a static active assignment status list.

Dynamic participant-scale IN shapes were replaced in applications, submission monitoring, judging assignment detail aggregation, shortlist/outcome aggregation, prize redemption listings, outcome email enqueueing, lifecycle transition actions, credits/roles listings, public profile icon routes, account participation, and hackathon management visibility/candidate queries.

Smoke run passed after the query changes: .wrangler/load-test-reports-in-cleanup-smoke/local-40-participant-hackathon-2026-04-28T22-06-58-198Z.json.

10000-participant load run report: .wrangler/load-test-reports-10000-no-dynamic-in/local-10000-participant-hackathon-2026-04-28T22-46-06-675Z.json and .wrangler/load-test-reports-10000-no-dynamic-in/local-10000-participant-hackathon-2026-04-28T22-46-06-675Z.md. The lifecycle reached lastCompletedPhase=completed with 240/240 checks passed and 51 API performance probes recorded. The harness status is failed only because the post-completion browser metrics path hung on the admin operations page and the spawned browser was terminated to unblock report writing; the underlying D1 hackathon state is completed.

Slowest API probes from the 10k run: prize-redemptions at winners_announced p95 3231ms / avg 2688ms; prize-redemptions at completed p95 3088ms / avg 2613ms; judging assignments at pitch_review p95 1609ms / avg 1365ms; judging assignments at shortlist p95 1569ms / avg 1327ms; completed published-projects p95 1451ms / avg 1306ms. No API probe failures.

Standalone browser metrics against the completed 10k state after restarting Nuxt: admin operations page passed in 7610ms with responseEnd 7577ms and ~1.14 MB transferred; public completed page passed in 1965ms with responseEnd 1945ms and ~1.51 MB transferred. Manual Lighthouse report: .wrangler/load-test-reports-10000-no-dynamic-in/lighthouse-public-completed-manual-2026-04-28T22-46Z.json; scores performance 0.39, accessibility 1.00, best-practices 1.00, seo 1.00; FCP 39.1s, LCP 43.2s, TBT 630ms, CLS 0, interactive 103.2s.

Validation after final changes passed: bun run lint, bun run typecheck, bun run test:unit. No new unit tests were added; the coverage for this task is the dynamic IN inventory, smoke lifecycle run, 10000-participant lifecycle/performance run, standalone browser metrics, Lighthouse, and existing unit suite.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Replaced participant-scale dynamic IN query shapes across lifecycle/read paths with joins, exists subqueries, or hackathon-scoped relational reads. Remaining IN clauses are static status/role/document lists, hackathon settings lists, or single-team bounded helper lookups and are recorded in the implementation notes.

The 10000-participant lifecycle reached completed with 240/240 checks passing and 51 API performance probes. The generated harness report is marked failed because the post-completion admin browser metric hung and the spawned browser had to be terminated to write the report; a standalone browser pass against the completed state succeeded, and Lighthouse was collected separately.

Validation passed with bun run lint, bun run typecheck, and bun run test:unit.
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
