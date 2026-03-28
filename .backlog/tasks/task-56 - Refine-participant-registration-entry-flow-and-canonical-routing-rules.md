---
id: TASK-56
title: Refine participant registration entry flow and canonical routing rules
status: Done
assignee:
  - codex
created_date: '2026-03-28 11:50'
updated_date: '2026-03-28 12:06'
labels:
  - ux
  - participant
  - docs
dependencies: []
documentation:
  - docs/api-surface.md
  - docs/domain-model.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the public hackathon registration entry flow so it behaves as a narrow participant application entry point rather than a mixed public/account workspace. Remove impossible UI states through redirects, keep only the stale registration-closed message in the form when the state changes while the page is open, improve participant-facing copy around account fields and team-intent selection, and document the canonical behavior in the product docs.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The public hackathon detail page shows the registration CTA only while the hackathon is in `registration_open`.
- [x] #2 The `/hackathons/:slug/register` flow redirects anonymous visitors into Auth0 login, redirects authenticated users without a platform account into account completion, redirects existing applicants to `/account/hackathons/:slug`, and redirects direct visits back to the public hackathon detail page when registration is not open.
- [x] #3 The registration form keeps only the participant-facing stale-state message for registration closing while the user is already on the page, and no longer renders application-status or platform-account edge-state panels in the public registration form.
- [x] #4 Participant-facing registration copy is updated to remove internal language, clarify unusual account fields, and replace the ambiguous `Not sure` team-intent option with copy that explicitly says the user can decide later.
- [x] #5 Canonical docs describe the registration entry-flow routing and copy expectations clearly enough for future implementation and review.
- [x] #6 Relevant unit tests cover the updated routing or helper behavior, and `bun run test:unit` passes.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update public hackathon entry points so registration CTAs appear only during `registration_open`, including the public detail page and any linked public terms surface that routes back into registration.
2. Tighten `/hackathons/[slug]/register` routing so anonymous visitors go to Auth0, authenticated users without a platform account go to account completion, existing applicants go to `/account/hackathons/[slug]`, and direct visits outside `registration_open` return to the public hackathon page.
3. Simplify the public registration panel to remove status/account edge-state panels, keep only the stale registration-closed message for users already on the form, and update participant-facing field and team-intent copy.
4. Update canonical docs to describe the registration entry flow as a narrow participant application route with redirect-based handling for impossible states.
5. Add or update unit tests for the new helper and routing/copy behavior, then run `bun run test:unit`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented redirect-first public registration entry handling so impossible states do not render in the public form. Public detail registration CTA now appears only during `registration_open`, register route redirects existing applicants to `/account/hackathons/:slug`, and direct visits outside registration redirect back to the public detail page.

Updated participant-facing registration copy to remove internal platform language, renamed the undecided team-intent option to `I'll decide later`, and clarified that team hints do not create a team.

Validation: `bun run test:unit` passed. `bun run typecheck` is currently failing due unrelated existing server-side issues in `server/api/hackathons/[hackathonId]/applications/actions/apply-staged-decisions.post.ts` and `server/api/hackathons/[hackathonId]/applications/index.post.ts`. Targeted ESLint on changed files completed with existing `vue/no-v-html` warnings only on markdown-rendering pages.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Cleaned up the participant registration entry flow so the public registration route behaves as a narrow application-entry page instead of a mixed public/account workspace.

What changed:
- Added shared registration-entry helpers to centralize CTA visibility and route resolution for public registration entry points.
- Hid the public `Register` CTA outside `registration_open` and updated the application-terms back link to fall back to the public hackathon page when registration is no longer open.
- Updated `/hackathons/[slug]/register` to redirect existing applicants to `/account/hackathons/:slug` and direct visits outside `registration_open` back to the public hackathon page, while relying on auth/account routing to handle anonymous and incomplete-account users.
- Simplified the public registration form by removing application-status and account-edge-state panels from the public route, removing the profile-icon block, and tightening participant-facing copy around OpenAI details, team intent, and post-submit expectations.
- Documented the canonical routing and copy expectations in `docs/api-surface.md` and `docs/domain-model.md`.
- Added unit coverage for registration-entry helper behavior and updated auth-navigation tests for preserved account-completion return targets.

Validation:
- `bun run test:unit` ✅
- `bun run typecheck` ⚠️ blocked by unrelated existing server errors in `server/api/hackathons/[hackathonId]/applications/actions/apply-staged-decisions.post.ts` and `server/api/hackathons/[hackathonId]/applications/index.post.ts`
- Targeted ESLint on changed files completed with existing `vue/no-v-html` warnings only on markdown-rendering pages.

Risks / follow-up:
- Typecheck is not clean at repository level because of pre-existing server-side issues outside this change set.
- There are unrelated uncommitted local changes in separate files that were intentionally left out of this work.
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
