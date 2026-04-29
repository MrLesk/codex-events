---
id: TASK-299
title: Optimize server-side 10000-participant read paths
status: Done
assignee:
  - Codex
created_date: '2026-04-29 05:58'
updated_date: '2026-04-29 07:10'
labels:
  - performance
  - database
  - load-test
dependencies: []
references:
  - >-
    .backlog/tasks/task-298 -
    Replace-dynamic-IN-query-shapes-and-rerun-10000-participant-load-test.md
documentation:
  - docs/README.md
  - docs/domain-model.md
modified_files:
  - app/components/account/hackathons/AccountHackathonAdminOperationsPanel.vue
  - app/components/admin/AdminCompetitionAssignmentsPanel.vue
  - app/composables/useAdminWorkspace.ts
  - app/utils/admin-workspace.ts
  - docs/api-surface.md
  - docs/schema-outline.md
  - drizzle/0046_server_read_path_performance.sql
  - 'server/api/hackathons/[hackathonId]/actions/complete.post.ts'
  - 'server/api/hackathons/[hackathonId]/applications/index.get.ts'
  - 'server/api/hackathons/[hackathonId]/judging/assignments/index.get.ts'
  - 'server/api/hackathons/[hackathonId]/judging/summary.get.ts'
  - 'server/api/hackathons/[hackathonId]/prize-redemptions/index.get.ts'
  - 'server/api/hackathons/[hackathonId]/submissions/summary.get.ts'
  - >-
    server/api/hackathons/[hackathonId]/teams/[teamId]/submission/public-visibility.patch.ts
  - server/database/schema.ts
  - server/utils/applications.ts
  - server/utils/judging.ts
  - server/utils/shortlist.ts
  - server/utils/submissions.ts
  - tests/unit/server/utils/submissions.test.ts
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Reduce server-side query cost and response size on the 10000-participant hackathon paths identified after dynamic IN removal. Focus on the slow admin and public read paths: applications, teams/submission monitoring, judging assignments, prize redemptions, winners, published projects, and completed-state public views.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Large read endpoints expose bounded result sets or explicit summary/detail shapes so default server responses do not require returning every participant-scale row.
- [x] #2 Slow 10000-participant paths use appropriate compound indexes for their join/filter/order predicates.
- [x] #3 Completed-state public reads avoid repeatedly rebuilding immutable aggregates from participant-scale joins when a hackathon is completed.
- [x] #4 Server responses select only fields required by the endpoint contract and avoid serializing avoidable nested data for default views.
- [x] #5 A 10000-participant performance run or targeted equivalent captures before/after-relevant metrics for the optimized endpoints.
- [x] #6 Repository validation passes with `bun run lint`, `bun run typecheck`, and `bun run test:unit` before handoff.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add pagination/query contracts for large admin read endpoints and update internal consumers to request pages explicitly.
2. Add lightweight summary/count reads for lifecycle metrics and admin oversight where full rows are unnecessary.
3. Add compound indexes for the measured join/filter/order hot paths and include a local migration.
4. Add a completed-outcome cache table/helper so completed public winners/published-project reads do not rebuild leaderboard aggregates on every request.
5. Trim admin assignment/prize response shapes to the fields used by operations views.
6. Run targeted 10000-participant metrics against the completed load-test state, then lint/typecheck/unit validation.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Context brief: This is L2 because endpoint contracts, app consumers, schema indexes, derived outcome reads, and performance tests are all affected. Relevant patterns reviewed: docs/api-surface.md pagination conventions, server/api/hackathons/[hackathonId]/teams/index.get.ts and server/utils/team-formation.ts paginated list pattern, app/utils/admin-workspace.ts listAllPaginatedItems helper, server/utils/shortlist.ts completed outcome derivation, server/utils/prize-redemptions.ts admin prize aggregation, server/api/hackathons/[hackathonId]/judging/assignments/index.get.ts assignment detail shape, docs/database-query-plan-audit.md hot-path recommendations, and TASK-298 10k metrics. Main risks: public completed views must stay correct when teams toggle post-completion project visibility, and admin lifecycle controls must use summary counts rather than full assignment/application records.

Targeted 10000-participant performance validation used the preserved TASK-298 completed state copied from `.wrangler/state-load-10000-no-dynamic-in` to `.wrangler/state-task-299-perf`, then applied `0046_server_read_path_performance.sql` before probing optimized endpoints through the local Nuxt server as `hackathon_admin`. Baseline comparisons come from `.wrangler/load-test-reports-10000-no-dynamic-in/local-10000-participant-hackathon-2026-04-28T22-46-06-675Z.md`.

Targeted metrics after optimization over 5 warmed samples: applications default page avg 176ms/p95 180ms/37.8KB versus prior completed applications p95 1024ms and full-row checks up to 1735ms; applications page_size=100 avg 179ms/p95 183ms/188KB; submission summary avg 19ms/p95 25ms; judging summary avg 18ms/p95 21ms; judging assignments default page avg 15ms/p95 16ms/84B versus prior completed judging assignments p95 1547ms; prize redemptions default avg 221ms/p95 233ms/772KB versus prior completed prize-redemptions p95 3088ms; explicit `include_rankings=true` prize redemptions avg 998ms/p95 1054ms/8.29MB; cached winners avg 73ms/p95 82ms/266KB versus prior p95 1312ms; cached published projects avg 88ms/p95 90ms/5.68MB versus prior p95 1451ms. Public cached reads matched the internal routes: winners avg 75ms/p95 87ms, published projects avg 87ms/p95 98ms.

The first targeted run exposed a D1 `SQLITE_TOOBIG` failure when storing the whole completed outcome payload in one cache row. The implementation now stores a small cache generation row plus ordered per-entry payload rows, with 100 winner entries and 5300 published-project entries generated for the 10k completed state.

Post-validation review added two small correctness fixes: pitch assignment summaries now expose pitch submission labels in the admin oversight UI, and the prize-redemptions `include_rankings` query only opts in for boolean true or the string `true`. Required validation was rerun after those edits and passed again with `bun run lint`, `bun run typecheck`, and `bun run test:unit` (84 files, 564 tests).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented bounded and summary-oriented server reads for participant-scale admin paths: applications are paginated with status totals, submission and judging summary endpoints back lifecycle metrics, admin judging assignments default to a paginated active-assignment summary, and prize redemptions omit ranking context unless `include_rankings=true` is requested. Added compound indexes for the measured join/filter/order hot paths and trimmed default response shapes used by the Operations UI.

Completed-state winners and published projects now read from a generated outcome cache. The cache uses a generation header plus ordered row-sized entries so the 10k public outcome payload avoids D1 cell-size limits while repeated completed reads no longer rebuild leaderboard/prize/member aggregates. The cache is refreshed on completion and public visibility changes.

Targeted 10k validation against the preserved completed load-test state showed the optimized defaults materially faster than the TASK-298 baseline: applications p95 180ms, judging assignments p95 16ms, prize redemptions default p95 233ms, cached winners p95 82ms, and cached published projects p95 90ms. Validation passed with `git diff --check`, `bun run lint`, `bun run typecheck`, and `bun run test:unit` (84 files, 564 tests).
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
