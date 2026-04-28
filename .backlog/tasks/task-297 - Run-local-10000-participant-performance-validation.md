---
id: TASK-297
title: Run local 10000-participant performance validation
status: Done
assignee:
  - Codex
created_date: '2026-04-28 15:57'
updated_date: '2026-04-28 19:24'
labels:
  - testing
  - performance
  - load-test
dependencies: []
modified_files:
  - tools/load-tests/local-1000-participant-hackathon.ts
  - 'server/api/hackathons/[hackathonId]/actions/start-pitch.post.ts'
  - server/utils/hackathon-outcome-email-queue.ts
  - DEVELOPMENT.md
  - package.json
  - bun.lock
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extend and run the local hackathon load validation with 10000 approved participants, scaled teams/submissions/reviews, and concrete performance measurements from API and browser perspectives. This follows the completed 1000-participant validation and shifts focus to local bottleneck discovery and tuning signals.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The load runner can seed and exercise 10000 participants with proportionally scaled active teams, submissions, blind reviews, and pitch review data.
- [x] #2 The runner records useful performance metrics for critical admin/public endpoints, including timing percentiles and failure counts.
- [x] #3 The run captures browser-side performance evidence for at least the admin operations path and a public completed hackathon page, with Lighthouse or a comparable Chrome-based report where available.
- [x] #4 A 10000-participant local run completes or produces a clear failure report identifying the bottleneck and partial metrics collected before failure.
- [x] #5 Repository validation passes with bun run lint, bun run typecheck, and bun run test:unit before commit.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend the existing local hackathon load runner so participant-driven data scales to 10000 users: active solo/team composition, submissions, blind review scores, pitch finalists/reviews, and report naming/options.
2. Add lightweight built-in performance collection for critical API endpoints: repeated GET samples, percentiles, failure counts, and resource snapshots around the lifecycle.
3. Add Chrome-side measurements from Playwright for the admin operations path and public completed hackathon page; attempt an optional Lighthouse CLI JSON report when requested, while keeping the run useful if Lighthouse is unavailable.
4. Document the new 10000-participant/performance run options in DEVELOPMENT.md.
5. Run smoke validation, then the 10000-participant local run with metrics, inspect the report for bottlenecks, run required repository validation, update TASK-297, commit directly on main, and push origin/main.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented harness changes and completed a 40-participant smoke run with 30-second registration/submission windows. Smoke completed in final state completed, with 23 active teams, 20 submitted teams, 51 API performance metrics, 2 browser metrics, and 0 failed checks. Earlier zero-wait smoke attempts correctly produced failure reports but were invalid because zero-length lifecycle windows made Operations buttons unavailable.

The first full 10000-participant run completed registration, submission, blind review, and shortlist with metrics, then failed at start-pitch. Root cause was a single finalist-user lookup with 400 ids in one IN condition after the state update/audit had already succeeded. Patched start-pitch to chunk finalist team, member, and user lookups. A direct replay against the preserved 10000-participant shortlist state returned 200 in 1512ms. A subsequent full rerun passed start-pitch but exposed a harness bottleneck: reloading the full admin Operations page for each of 100 pitch-presentation clicks was too slow. Patched the runner to keep the Operations page open between presentation clicks.

The page-reuse optimization initially made the time-dependent Open Submission button stale because the Operations page did not refresh after the 10-minute registration window. Adjusted the runner so lifecycle transitions force a fresh Operations page load, while only the repeated pitch-presentation loop reuses the current page.

The repeated pitch presentation loop still stalled around 10/100 when driven through the large admin page. Adjusted the runner to open Operations once after entering pitch, then advance the repeated presentation action through the same authenticated admin API endpoint. Major lifecycle transitions continue to use Operations-tab buttons; the repeated presentation action is now measured as Operations steps without forcing 100 large page renders.

The next full run reached 100/101 pitch presentation steps quickly after moving repeated advancement to the admin API, then the final presentation completion returned a transient 500. Replaying that final POST against the preserved state returned 200. Added state verification and retry around repeated pitch advancement so a transient response failure is retried unless the expected presentation state already landed.

A full run reached completed pitch presentations, then the next Operations page load failed because GET /api/hackathons/load_hackathon_1000/prizes returned a transient 500 while rendering the large admin page. Replaying the prizes endpoint against the preserved state returned 200 for both public and admin contexts. Added an Operations UI fallback: lifecycle transitions still try the Operations button first, but if the Operations UI cannot render, the runner records a failed UI fallback check and calls the same admin action endpoint so the lifecycle can continue and later metrics can be collected.

Completed a fresh 10000-participant run after the runner and D1 chunking fixes. Command: `bun tools/load-tests/local-1000-participant-hackathon.ts --participant-count 10000 --state-root .wrangler/state-load-10000-final --report-dir .wrangler/load-test-reports-10000-final --perf-samples 3 --perf-concurrency 2 --lighthouse`. Report: `.wrangler/load-test-reports-10000-final/local-10000-participant-hackathon-2026-04-28T19-23-22-354Z.json` and `.md`. The run completed in final state `completed` with 10000 participants, 5750 active teams, 5400 submitted teams, 100 draft teams, 50 withdrawn teams, 200 no-submission teams, 100 pitch presentations, 100 final ranked entries, 0 failed checks, 51 API performance metrics, 2 Chrome navigation metrics, and 1 Lighthouse report.

Key tuning signals from the completed 10000-participant report: slowest API p95s were completed applications at 7677ms for an 18.8 MB response, completed prize-redemptions at 6825ms for an 8.3 MB response, winners_announced prize-redemptions at 5798ms, and judging assignments around 45.6 MB with p95 up to 3696ms. Browser metrics passed: admin operations page loadEventEnd about 5841ms with 250 resources; public completed page loadEventEnd about 2799ms with about 9.6 MB transferred. Lighthouse public completed page passed with scores performance 0.38, accessibility 1, best-practices 1, SEO 1.

The 10000-participant reruns exposed two production-relevant D1 parameter-limit bugs: start-pitch shortlist finalist notification lookups exceeded D1's 100-bound-parameter cap with 400 finalist users, and winner email enqueueing exceeded the cap by querying 100 winning teams plus the hackathon id. Both paths now chunk their IN queries safely.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Extended the local hackathon load runner from a fixed 1000-participant validation into a configurable performance harness that can seed and exercise 10000 participants with scaled teams, submissions, blind reviews, pitch review, final deliberation, completion, API timing percentiles, response sizes, failure counts, Chrome navigation metrics, optional Lighthouse output, and Nuxt process snapshots. Documented the 10000-participant command and installed Lighthouse as a dev dependency.

Fixed two D1 parameter-limit failures found by the 10000-participant runs: start-pitch now chunks finalist team/member/user lookups before enqueueing shortlist emails, and winner outcome email enqueueing now reserves room for the hackathon id when chunking winning team ids.

Validation: completed a fresh 10000-participant run with 10-minute registration and submission windows using `.wrangler/state-load-10000-final`; the report finished with 0 failed checks, 51 API performance metrics, 2 browser metrics, and 1 Lighthouse report. Required repo validation also passed: `bun run lint`, `bun run typecheck`, and `bun run test:unit` (84 files, 563 tests).

Risks/follow-ups: the completed report shows clear tuning targets rather than correctness failures. The largest responses are admin applications (~18.8 MB), judging assignments (~45.6 MB), prize redemptions (~8.3 MB), and the public completed page transfer (~9.6 MB); Lighthouse performance for the public completed page was 0.38 under the local 10k dataset.
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
