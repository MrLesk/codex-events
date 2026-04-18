---
id: TASK-270
title: Reveal winner projects only when a hackathon is completed
status: Done
assignee:
  - codex
created_date: '2026-04-18 11:47'
updated_date: '2026-04-18 12:06'
labels:
  - hackathons
  - winners
  - ui
  - api
dependencies: []
references:
  - 'app/pages/hackathons/[slug]/index.vue'
  - 'app/pages/account/hackathons/[slug]/index.vue'
  - server/utils/shortlist.ts
  - 'server/api/hackathons/[hackathonId]/actions/announce-winners.post.ts'
  - 'server/api/hackathons/[hackathonId]/actions/complete.post.ts'
documentation:
  - docs/lifecycle-and-state-machines.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
  - docs/domain-model.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Move winner-project visibility from winner announcement to hackathon completion across the public and account detail pages. The completed state should expose a shared winners showcase that emphasizes prizes and winning projects, while winner announcement remains operational only. The work also includes enriching the winners API payload, adding a public winners read and public-safe winner avatar access, freezing prize definition edits once winners are announced, removing earlier lightweight winner notices, updating canonical docs, and sending winner emails again when the hackathon is completed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Winner project data is hidden before `completed`, with account and public detail pages keeping the `Prizes` tab until completion and switching to a `Winners` showcase tab only at `completed`.
- [x] #2 The hackathon winners APIs return the completed winners showcase payload with project title, summary, repository/demo links, grouped prizes, and published team-member profile data including a public-safe profile icon URL shape.
- [x] #3 A shared winners showcase UI renders one card per winning project on both detail pages using existing component patterns, and the previous winner-name overlays and participant winner/final-rank notices are removed from earlier states.
- [x] #4 Prize create, update, and delete routes reject once a hackathon reaches `winners_announced` or `completed`, so published winners remain aligned with frozen prize definitions and redemption state.
- [x] #5 Completing a hackathon also enqueues winner emails, while the announce-winners action continues to create prize redemptions and send winner emails.
- [x] #6 Canonical lifecycle, permissions, and API docs plus automated test coverage are updated for the completed-only winners reveal, frozen prizes, public winners access, and completion-time winner emails.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update winner lifecycle and serialization in backend utilities so winner visibility is completed-only, the winners payload includes submission/project/member details, and prize mutations freeze from `winners_announced` onward.
2. Add the missing public winners read and public-safe winner profile-icon route, then reuse a shared outcome-email helper so `complete` also enqueues winner emails without changing prize-redemption behavior.
3. Build a shared winners showcase component from existing card/avatar/button patterns and swap both public and account detail pages from prize-list-with-winner-overlays to the completed-only winners showcase.
4. Remove earlier winner snippets from participation/workspace surfaces, update tab-label behavior, and keep the pre-completion `Prizes` tab semantics unchanged.
5. Update lifecycle, permissions, and API docs plus unit/integration coverage for completed-only visibility, frozen prizes, public winners access, and completion-time winner emails.
6. Run `bun run lint`, `bun run typecheck`, and `bun run test:unit`, fix any regressions, then record the final summary and remaining risks in the task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented a shared completed-only winners showcase across the public and account hackathon detail pages, removed earlier winner snippets from the prize list and participant notices, and kept the pre-completion `Prizes` experience intact.

Expanded winner serialization to include project summary/links plus published winner team-member data with a public-safe completed-only profile-icon route, and added a slug-based public winners endpoint for the public detail page.

Locked prize definition writes from `winners_announced` onward and extracted winner email enqueue logic so both `announce-winners` and `complete` send the same winner notification payload and audit records.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented the completed-only winners reveal across backend, UI, docs, and tests. The winners payload now includes project summary, repository/demo links, grouped prizes, and published winning-team member data with public-safe profile-icon URLs. Added `GET /api/public/hackathons/:slug/winners` plus a completed-only public winner avatar route, and changed the existing winners visibility guard so winner reads are unavailable until the hackathon reaches `completed`.

On the frontend, the public and account detail pages now keep the `Prizes` tab before completion and switch to a shared `HackathonWinnersShowcase` component only at `completed`. The old winner-name overlays in the prize list were removed, participant winner/final-rank notices were removed from overview and workspace surfaces, and admin prize configuration is hidden once winners are announced because prize definitions are frozen.

On the lifecycle side, prize create/update/delete routes now reject from `winners_announced` onward, and completing a hackathon now enqueues winner emails in addition to the existing announce-winners email send. Canonical docs were updated in `docs/lifecycle-and-state-machines.md`, `docs/permissions-matrix.md`, `docs/api-surface.md`, and `docs/domain-model.md` to reflect the new reveal timing and frozen prize behavior.

Validation run: `bun run lint`, `bun run typecheck`, and `bun run test:unit` all passed. I also ran targeted integration coverage with `bun run test:integration -- tests/integration/server/api/outcome-routes.test.ts tests/integration/server/api/hackathon-admin-routes.test.ts tests/integration/server/api/hackathon-routes.test.ts`, which passed and covers the new completion email send, frozen prize mutations, and public winners/avatar routes.
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
