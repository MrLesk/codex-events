---
id: TASK-296
title: Run local 1000-participant hackathon validation
status: Done
assignee:
  - '@codex'
created_date: '2026-04-28 06:04'
updated_date: '2026-04-28 10:29'
labels:
  - validation
  - load-test
  - d1
  - hackathon-lifecycle
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
  - docs/schema-outline.md
  - docs/testing-strategy.md
  - DEVELOPMENT.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Validate that a full local hackathon lifecycle remains stable with 1000 seeded participants after the prior production D1 IN-parameter failure. The run uses local Wrangler/Miniflare D1 only, seeds realistic participant/application/team/submission/judging data directly in the local database, keeps registration and submission phases open for at least 10 real minutes each, and uses the admin operations lifecycle path to advance through blind review, shortlist, pitch, pitch review, final deliberation, winners announced, and completed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A local D1 hackathon is created with full configuration, including two blind reviews per submission, pitch review enabled, multiple criteria, tracks, prizes, credit offers, required application/submission fields, and many agenda items.
- [x] #2 The local dataset includes 1000 approved participants with realistic application records and a mix of solo teams, multi-member teams, dissolved/left-team history, active teams, submitted projects, withdrawn or no-submission edge cases, and enough judges for two blind reviews per submitted project.
- [x] #3 The run keeps registration and submission phases open for at least 10 real minutes each before advancing.
- [x] #4 Admin lifecycle operations advance the hackathon through registration_open, submission_open, judging_preparation, blind_review, shortlist, pitch, pitch_review, final_deliberation, winners_announced, and completed.
- [x] #5 Large participant, team, submission, judging, shortlist, winner, redemption, and feedback/admin reads complete without D1 bound-parameter failures or HTTP 500 responses.
- [x] #6 The final result records what was tested, any failures found, local commands used, and any follow-up fixes needed.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add an isolated local load runner under `tools/load-tests/` that targets a dedicated local D1 state root (default `.wrangler/state-load-1000`) so normal local and BDD state are not overwritten.
2. The runner applies local D1 migrations, reconciles existing stable Auth0 BDD personas, seeds platform documents, persona users, synthetic judge users, one fully configured hackathon, terms, tracks, criteria, prizes, credits, 1000 participant users/applications, realistic team membership history, active solo and multi-person teams, join-request history, and submission variants.
3. Start a local Nuxt server on the BDD/Auth0-compatible origin (`http://localhost:3100` by default), log in stable admin/judge personas, and open the admin Operations page for state visibility.
4. Use the admin session/Operations lifecycle path to open registration, wait at least 10 real minutes, open submission, wait at least 10 real minutes, stop submissions, start blind review, start shortlist, start pitch, advance pitch presentations, start pitch review, start final deliberation, announce winners, and complete the hackathon.
5. Use direct local D1 bulk updates after lifecycle transition points for scale-only participant/judge activity that would be impractical through 1000 individual browser sessions: submitted projects, completed blind scores, completed pitch scores, and post-completion feedback/visibility records.
6. During and after the run, issue large admin/participant/outcome reads and fail the run on HTTP 500s, D1 bind-parameter errors, or unexpected lifecycle state. Write a timestamped JSON and Markdown report under an ignored local artifacts directory.
7. Run focused validation for the new runner and then execute the full long-running validation. Record results, failures, and follow-ups on TASK-296.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Confirmed user choices: run against local Wrangler/Miniflare D1, create/exercise 1000 participants by direct local D1 seeding rather than 1000 real Auth0 accounts, and keep registration/submission phases open with real wall-clock waits of at least 10 minutes each.

Final full run completed successfully with 0 failed checks.

- Report: `.wrangler/load-test-reports/local-1000-participant-hackathon-2026-04-28T08-28-11-903Z.md`
- Duration: 1344 seconds
- Final state: `completed`
- Dataset summary: 1000 participants, 575 active teams, 540 submitted teams, 10 draft teams, 5 withdrawn teams, 20 no-submission teams, 25 pitch finalists/final ranking entries.

Failures reproduced and fixed during validation:

- `GET /api/hackathons/:id/teams/submission-monitor` failed at full scale from unbatched team/member/submission/user lookups.
- `POST /api/hackathons/:id/actions/start-judging-preparation` failed through `listSubmittedSubmissionsForHackathon`.
- `POST /api/hackathons/:id/actions/start-blind-review` failed from oversized submission-lock update chunks.
- `GET /api/hackathons/:id/prize-redemptions` failed after completion from completed outcome snapshot lookups that used 100 team IDs plus a fixed hackathon ID parameter.
- The local runner also needed retry handling for transient local D1 `SQLITE_BUSY` seed writes and a Nuxt `createUseAsyncData` macro fix for the account Operations page.

Validation commands run:

- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`
- `bun vitest run --config vitest.integration.config.ts tests/integration/server/api/submission-routes.test.ts tests/integration/server/api/hackathon-routes.test.ts tests/integration/server/api/judging-routes.test.ts tests/integration/server/api/outcome-routes.test.ts`
- `bun tools/load-tests/local-1000-participant-hackathon.ts`
<!-- SECTION:NOTES:END -->

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
