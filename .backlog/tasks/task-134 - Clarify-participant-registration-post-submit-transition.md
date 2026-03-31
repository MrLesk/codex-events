---
id: TASK-134
title: Clarify participant registration post-submit transition
status: Done
assignee:
  - codex
created_date: '2026-03-31 18:51'
updated_date: '2026-03-31 19:00'
labels:
  - frontend
  - ux
  - participant
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/api-surface.md
  - docs/lifecycle-and-state-machines.md
  - docs/testing-strategy.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Improve the participant hackathon registration experience after a successful application submission. Today the public registration page appears to reload and then pauses for a few seconds before redirecting into the account hackathon workspace, which makes it unclear whether the submission succeeded. The flow should give participants an explicit success handoff into their account workspace while preserving the existing registration-submitted notice there.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Successful hackathon application submission immediately gives the participant a clear success state instead of an ambiguous reload/loading gap
- [x] #2 The participant is then routed into the hackathon account workspace and still sees the one-time registration-submitted confirmation there
- [x] #3 Submission failures remain on the registration page with clear actionable feedback and no false success state
- [x] #4 Relevant tests are added or updated for the changed participant registration behavior
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update app/pages/hackathons/[slug]/register.vue so a successful application POST becomes the handoff point: show an explicit submitting-complete transition state, remove unnecessary post-submit read/reset work, and navigate into /account/hackathons/:slug with notice=application_submitted using replace semantics.
2. Update app/components/public/hackathons/HackathonRegistrationPanel.vue to render a clear success handoff state while the account workspace route is opening, instead of leaving the participant on an ambiguous loading gap.
3. Add focused automated coverage for the new registration transition behavior and run bun run lint, bun run typecheck, and bun run test:unit before handoff.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Replaced the ambiguous post-submit pause with an explicit registration handoff state on the public hackathon registration page.

Removed unnecessary post-submit work in the registration submit path by navigating immediately after a successful application POST instead of refetching the application record first.

Moved the application-submitted redirect target and one-time notice detection into shared participant-application helpers so the registration page and account workspace stay aligned.

Validation: bun run lint passed with the repo's existing vue/no-v-html warnings only; bun run typecheck passed; bun run test:unit passed.

Focused automated coverage was added at the participant-application helper level because this repo does not currently have a mounted page/component unit-test harness for the registration route.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Improved the participant registration submit handoff so the public `/hackathons/:slug/register` page now switches into an explicit success state as soon as the application POST succeeds, showing "Application submitted" and "Opening your hackathon workspace..." while the account workspace route loads. This removes the confusing dead period where the page appeared to reload before the redirect.

The registration submit path was also streamlined by removing the extra post-submit application refetch and centralizing the redirect target plus one-time `application_submitted` notice parsing in shared participant-application helpers. The account hackathon workspace still shows the existing one-time success confirmation after the redirect.

Tests: added helper coverage for the redirect/notice behavior in `tests/unit/app/utils/participant-application.test.ts`; `bun run lint` passed with existing `vue/no-v-html` warnings only, `bun run typecheck` passed, and `bun run test:unit` passed.

Docs and config were unchanged. Residual test gap: there is still no mounted page/component unit-test harness for the registration route, so the new UX handoff is covered through focused helper tests rather than direct component interaction tests.
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
