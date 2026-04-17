---
id: TASK-232
title: >-
  Validate participant Luma registration email during hackathon application
  submission
status: In Progress
assignee:
  - codex
created_date: '2026-04-17 08:19'
updated_date: '2026-04-17 09:50'
labels: []
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/api-surface.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Reject participant application submission when a hackathon requires a Luma email and has a configured Luma event API ID, but the submitted participant profile email is not registered as a guest on that Luma event. Keep the registration flow aligned with the existing participant application UX and the current asynchronous approval/rejection sync model.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 When a hackathon requires a Luma email and has a configured Luma event API ID, participant application submission verifies that the participant's saved Luma email exists on that Luma event before creating the application.
- [x] #2 If no Luma guest matches the participant's saved Luma email, the submission is rejected with participant-facing copy that makes Luma registration mandatory and explains that no guest was found for that Luma email.
- [x] #3 When the Luma guest lookup succeeds, application submission continues with the existing behavior, including the existing Luma sync status initialization.
- [x] #4 When Luma sync is not enabled for the hackathon, participant application submission behavior remains unchanged.
- [x] #5 Automated test coverage and canonical docs are updated for the registration-time Luma validation rule.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reuse the existing Luma guest-by-email lookup in `server/utils/application-luma-sync-queue.ts` by exporting a small registration-time validation helper instead of introducing a second Luma client.
2. Invoke that helper from `server/api/hackathons/[hackathonId]/applications/index.post.ts` only when `requireLumaEmail` is true and `lumaEventApiId` is configured.
3. Reject application submission only when Luma returns a definitive guest-not-found result, with participant-facing copy that says Luma registration is mandatory and no guest was found for the entered Luma email.
4. Keep transient Luma lookup failures non-blocking so submission behavior remains unchanged when Luma is temporarily unavailable.
5. Add integration and utility test coverage for guest found, guest not found, transient lookup failure, and unchanged behavior when sync is disabled.
6. Update `docs/domain-model.md` and `docs/api-surface.md` so the canonical registration rule matches the implementation.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
User confirmed that transient Luma lookup failures should not block registration submission; only definitive guest-not-found results should reject submission.

Implemented registration-time Luma guest validation by reusing the existing event guest lookup utility. Submission now rejects only definitive guest-not-found results and logs non-blocking lookup failures so transient provider issues do not stop registration.

Validation results: `bun run test:unit` passed, targeted integration coverage for `tests/integration/server/api/application-routes.test.ts` passed, and targeted ESLint for touched code files passed. Full `bun run lint` and `bun run typecheck` are currently blocked by unrelated existing worktree errors in `app/pages/account/hackathons/[slug]/index.vue`, `app/utils/hackathon-credits.ts`, `server/utils/hackathon-outcome-emails.ts`, and `server/utils/hackathon-participation.ts`.

User confirmed the remaining full-repo `lint` and `typecheck` failures are owned by other agents because they are tied to unrelated changes in the current worktree. No additional changes will be made in those files from this task; TASK-232 is waiting only on shared repo validation to go green.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added registration-time Luma guest verification for participant applications when a hackathon requires a Luma email and has a configured `lumaEventApiId`. The submit route now checks the participant's saved `lumaEmail` against the configured Luma event guest list before creating the application. If Luma definitively reports that no guest matches the email, the API returns a participant-facing `luma_registration_required` error explaining that Luma registration is mandatory and no guest was found for the entered email. If the lookup cannot be completed because of provider or configuration issues, submission stays non-blocking and the skip is logged for operators.

To support that flow cleanly, `server/utils/application-luma-sync-queue.ts` now exports a reusable lookup helper that returns `found`, `not_found`, or `lookup_failed` outcomes without changing the existing async approval/rejection sync path. The participant registration form also now tells users up front to enter the same email they used on the Luma event. Canonical docs in `docs/domain-model.md` and `docs/api-surface.md` now describe the registration-time guard.

Tests updated:
- `bun run test:unit` passed
- `bun run test:integration -- tests/integration/server/api/application-routes.test.ts` passed
- Targeted ESLint for touched code files passed

Validation blocker:
- Full `bun run lint` and `bun run typecheck` currently fail because of unrelated pre-existing worktree issues in other files, so the task remains short of a clean repo-wide validation pass even though the changed area itself is green.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [ ] #3 Relevant validation commands pass
- [x] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [x] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
