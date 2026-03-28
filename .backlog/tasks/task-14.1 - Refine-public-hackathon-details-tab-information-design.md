---
id: TASK-14.1
title: Refine public hackathon details tab information design
status: Done
assignee:
  - '@codex'
created_date: '2026-03-28 14:53'
updated_date: '2026-03-28 16:22'
labels:
  - frontend
  - public-discovery
  - design
dependencies: []
references:
  - '/Users/alex/projects/codex-hackathons/app/pages/hackathons/[slug]/index.vue'
  - >-
    /Users/alex/projects/codex-hackathons/app/components/public/hackathons/HackathonTimeline.vue
  - >-
    /Users/alex/projects/codex-hackathons/app/composables/useHackathonPresentation.ts
  - >-
    /Users/alex/projects/codex-hackathons/Figma-Design/src/app/pages/HackathonDetail.tsx
documentation:
  - docs/domain-model.md
  - docs/api-surface.md
  - docs/design-reference.md
parent_task_id: TASK-14
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Improve the public hackathon detail route's Details tab so it feels intentional and participant-useful rather than like a leftover status dump. The current top row correctly shows registration and submission windows, but the third card is sparse and can surface low-signal values such as `0 Dimensions`. Rework the Details tab to better use the existing public hackathon data for participant-facing context while preserving the canonical public-only surface and current route behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The public hackathon Details tab presents participant-useful public information with stronger hierarchy and no low-signal placeholders such as `0 Dimensions`.
- [x] #2 The Details tab continues to use only public-safe hackathon data already exposed by the route and does not introduce admin-only metrics or controls.
- [x] #3 The revised Details tab remains visually aligned with the current public detail page treatment across desktop and mobile layouts.
- [x] #4 Relevant frontend validation is run for the changed surface, and any remaining visual or test gaps are documented in the task summary.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Keep the Details tab agenda section unchanged and scope visual changes to the top card row only.
2. Update the top row layout to two cards on desktop: `Registration Window` and `Event Details`.
3. Preserve the existing registration-window content, tightening spacing and hierarchy only as needed.
4. Replace the current non-registration card with `Event Details`, showing `Team size` and `Attendance` for all hackathons.
5. Show `Location` only when `inPersonEvent = true`, using public location data already on the route.
6. Show a `Luma event` row only when a public Luma URL exists.
7. Do not show submission timing, required profiles, application extras, judging format, current phase, scoring, or zero-criteria placeholders in this pass.
8. Update or add targeted presentation tests only if helper behavior changes, then run `bun run test:unit` before handoff.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
User requested approval before any code changes. Current approved scope candidate is limited to the top details-tab card row only; do not modify the agenda section unless explicitly requested later.

User rejected the submission-window card for the details tab because the agenda below already covers hackathon timing. Keep registration-window context because it happens outside the hackathon window, but replace submission timing with more participant-useful pre-event/logistics information.

User explicitly rejected showing required profiles or application-extras summaries in the details tab. Keep registration-form requirements out of this pass; focus the non-registration card on program-level public details instead.

User rejected judging format, current phase, and scoring from the non-registration card because that information is already visible elsewhere or not useful for this tab. Keep attendance; prefer practical logistics instead.

User approved the two-card top row. Additional constraint: show location only when the hackathon is marked as in-person.

Implemented the approved top-row-only redesign in `app/components/public/hackathons/HackathonTimeline.vue`. The details tab now uses a two-card layout: `Registration Window` plus `Event Details`, with the agenda section untouched. `Event Details` includes team size and attendance for all hackathons, adds location only when `inPersonEvent = true`, and adds a `Luma event` link row only when a public Luma URL exists. Removed the submission-window card and the old judging/criteria/current-phase content from this surface per user direction.

Validation: `bun run test:unit` passed. `bunx eslint --no-ignore app/components/public/hackathons/HackathonTimeline.vue` passed. `bun run typecheck` fails due pre-existing unrelated server-side errors in `server/api/hackathons/[hackathonId]/applications/actions/apply-staged-decisions.post.ts` and `server/api/hackathons/[hackathonId]/applications/index.post.ts`. No docs changes were required for this UI-only pass.

Test gap: no automated component-level visual test was added because the change is layout/content presentation in a shared Vue component and there is no existing focused component test harness for this surface.

Follow-up correction after visual review: reverted the temporary grid-alignment tweak because it did not address the reported issue. Updated the registration card to derive status, note, and progress from the displayed registration date window instead of the old fake state-based bar. The close date is treated as inclusive for the card UI, so an event on its displayed closing day shows `Open now`/`Closes today` with near-complete progress rather than an already-complete bar.

User requested another refinement to the registration card: replace the compact date range with agenda-like start/end date-time presentation, including a downward flow between start and end. Keep the corrected date-window-based status/progress behavior.

Implemented the approved agenda-like registration-window presentation. The registration card now shows separate `Opens` and `Closes` blocks with local day/date/time labels and a downward arrow between them, while keeping the corrected date-window status/note/progress behavior underneath.

User confirmed the registration window should close at the actual displayed time, not at the end of the displayed day. Reverting the earlier day-inclusive window logic to exact timestamp semantics while keeping the agenda-like start/end presentation.

Corrected the registration-window helpers again after user review: the window now closes on the exact stored timestamp, not at the end of the displayed day. Open-state progress is capped below 100 so the bar cannot appear fully complete before the real close time.

Align public registration availability with exact registration timestamps so closed hackathons do not keep showing the Register CTA or accept direct registration entry.

Updated public registration availability to use exact registration timestamps rather than hackathon state alone. The public detail CTA now disappears after the close timestamp, the register route redirects back to the public detail page once the window has closed, and server-side application submission now rejects stale registration_open states once the configured registration window has ended.

Follow-up consistency fix: derive the public lifecycle badge from the exact registration window so public header/card badges no longer show `Registration open` after the registration card has already switched to closed.

Added a shared public state-presentation helper so the public detail header badge and public hackathon card badge now collapse stale `registration_open` state to `Registration closed` once the exact registration close timestamp passes.

Prize-order follow-up: when `displayOrder` ties, sort prizes by `rankEnd` ascending and `rankStart` descending so single-rank podium prizes render before wider rank-range benefits that end on the same rank.

Implemented prize tie-break ordering change. When `displayOrder` matches, prize lists now sort by `rankEnd` ascending and `rankStart` descending across public/internal prize APIs, shortlist winners-view prize reads, hackathon prize-redemption ordering, and the admin settings prize list comparator.

Prize-list layout follow-up: remove the overly aggressive fixed description max-width for non-podium prizes so rows without a trophy icon can use the available horizontal space before wrapping.

Removed the fixed prize-description max-width and let the prize text column grow naturally with `min-w-0 flex-1`, so non-podium rows without an icon no longer wrap early.

Prize-list layout correction: preserve the right-aligned reward column on podium rows by making the left row block `min-w-0 flex-1` and the reward column `shrink-0`, instead of relying on a fixed description width.

Prize-list regression fix: kept the wider natural text column, but made the left row group `min-w-0 flex-1` and the reward column `shrink-0 text-right` so podium rows keep the reward block aligned on the right instead of wrapping underneath.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Refined the hackathon details-tab top row in `app/components/public/hackathons/HackathonTimeline.vue` to match the approved simpler information model. The row now renders as two cards instead of three: `Registration Window` remains as the pre-event timing anchor, and the second card is now `Event Details` with team size, attendance, in-person-only location, and an optional public Luma link. This removes the redundant submission-window card and the low-value judging/criteria/current-phase content that the user explicitly rejected for this tab. The agenda section below was left unchanged.

Validation ran with `bun run test:unit` and a targeted `bunx eslint --no-ignore app/components/public/hackathons/HackathonTimeline.vue`, both passing. I also ran `bun run typecheck`, but it is currently blocked by unrelated existing server-side errors in `server/api/hackathons/[hackathonId]/applications/actions/apply-staged-decisions.post.ts` and `server/api/hackathons/[hackathonId]/applications/index.post.ts`, so this pass does not attempt to resolve those broader issues. No docs changes were needed because the change stays within the existing canonical public hackathon surface.

Follow-up correction: the registration card now uses date-window semantics for the top-row UI instead of the earlier placeholder progress behavior. This keeps the green bar and status aligned with the displayed registration dates, and the temporary grid-height tweak was reverted because it was not the real issue.

The registration card now presents explicit start and end date-time blocks, using the same directional language as the agenda instead of a compact one-line date range.

Final correction: registration-window status, note, and progress now follow the exact stored timestamps. The card stays open only until the actual closing time and the progress bar cannot render as fully complete while the window is still technically open.

Follow-up registration fix: public registration availability now respects the exact stored registration timestamps. The public detail page CTA, the register-route redirect logic, and the application submission policy all use the configured registration open/close window instead of relying on `hackathon.state` alone, so stale `registration_open` state no longer keeps registration visible or submittable after the closing time. Server-side application submission now enforces the same window. Validation: targeted `eslint` on touched files passed aside from existing `vue/no-v-html` warnings on the public detail and application-terms pages, and focused tests passed with `bunx vitest run tests/unit/app/utils/participant-application.test.ts tests/unit/server/utils/applications.test.ts`. The broader `bun run test:unit` suite still fails in the unrelated existing `tests/unit/app/utils/auth-navigation.test.ts` expectations around `/account` vs `/account/dashboard`.

Final consistency pass: public state badges now use a shared presentation helper from `app/composables/useHackathonPresentation.ts`. The public detail header and public hackathon card no longer show `Registration open` after the registration window has closed; they now render a neutral `Registration closed` badge based on the exact timestamp, matching the registration card semantics. Focused tests passed for presentation helpers, participant-registration helpers, and server application gating. The broader `bun run test:unit` suite still fails only in the unrelated existing `tests/unit/app/utils/auth-navigation.test.ts` account-path expectations.

Prize-order follow-up: the old tie-breaker used `rankStart` then `rankEnd`, which put broad `1-3` or `1-5` benefits between podium prizes when all `displayOrder` values were `0`. The tie-breaker now uses `rankEnd` ascending and `rankStart` descending, so `1st`, `2nd`, `3rd` appear before broader `Top 3`/`Top 5` prizes that end on the same rank. Validation: `bun run test:unit` passed, targeted prize-route integration tests passed, and targeted eslint passed for the touched server/test files. Broad integration runs for the full `hackathon-routes` file still contain unrelated existing D1 fixture batching failures (`too many SQL variables`) outside the prize-order test case.

Final prize-list layout polish: removed the hard-coded `max-w-[42rem]` description width in the public prize list and let the text column size naturally within the row. This fixes premature wrapping for non-podium prizes that do not render a trophy icon. Validation: `bunx eslint --no-ignore app/components/public/hackathons/HackathonPrizeList.vue` passed and `bun run test:unit` passed.

Prize-list regression fix: the earlier width change widened the entire left prize block and pushed the reward column below the content on trophy rows. The row now uses `min-w-0 flex-1` on the left content group and `shrink-0` on the reward column, preserving the original right-hand alignment while still letting non-icon rows use the extra width. Validation: `bunx eslint --no-ignore app/components/public/hackathons/HackathonPrizeList.vue` passed and `bun run test:unit` passed.
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
