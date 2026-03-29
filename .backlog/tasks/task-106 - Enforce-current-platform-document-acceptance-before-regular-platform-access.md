---
id: TASK-106
title: Enforce current platform document acceptance before regular platform access
status: Done
assignee:
  - '@codex'
created_date: '2026-03-29 20:13'
updated_date: '2026-03-29 20:34'
labels: []
dependencies: []
references:
  - /Users/alex/projects/codex-hackathons/server/auth/actor.ts
  - /Users/alex/projects/codex-hackathons/server/utils/platform-documents.ts
  - >-
    /Users/alex/projects/codex-hackathons/server/api/account/registration.post.ts
  - /Users/alex/projects/codex-hackathons/app/utils/navigation-guards.ts
documentation:
  - /Users/alex/projects/codex-hackathons/docs/domain-model.md
  - /Users/alex/projects/codex-hackathons/docs/api-surface.md
  - /Users/alex/projects/codex-hackathons/docs/testing-strategy.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Treat current acceptance of the published platform privacy policy and platform terms as a required authorization condition for regular platform-user access. The platform database remains the source of truth for exact-version acceptance records. A user whose Auth0 identity exists but whose product-side acceptances are missing or outdated should not be treated as a normal platform user until they complete the platform-consent flow again. This closes the gap where social login can create or reuse an Auth0 identity without guaranteeing current platform consent in product data.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Actor resolution and normal platform authorization use product-side current platform-document acceptance, not only platform-account existence, when deciding whether the caller has regular platform-user access.
- [x] #2 A dedicated `/account/register` page lets an authenticated user with a platform account but missing or outdated required platform-document acceptances review the current Privacy Policy and Platform Terms, accept both, and continue into normal account workflows.
- [x] #3 All `/account/*` routes except the dedicated completion route redirect users with missing or outdated required platform-document acceptances to `/account/register`.
- [x] #4 Hackathon registration and participant workspace entry from hackathon pages are blocked until the user has accepted the current platform Privacy Policy and Platform Terms.
- [x] #5 The Auth0 hosted signup screen no longer presents platform terms/privacy consent checkboxes, and canonical docs plus automated coverage are updated to match the app-owned consent flow.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend backend actor/session resolution to derive current platform-consent state from product data, stop relying on hosted-signup consent claims for regular platform access, and expose the new state through `/api/session`.
2. Add a dedicated authenticated `/account/register` page that loads the current platform Privacy Policy and Platform Terms, lets the user accept both, and either creates the platform account or records missing current acceptances for an existing platform account.
3. Update shared frontend navigation and middleware so `/account/*` routes redirect consent-incomplete users to `/account/register`, while hackathon registration and participant-entry flows also route through that completion page instead of allowing direct registration from hackathon pages.
4. Remove the Auth0 hosted-signup checkbox partials and related consent-guard behavior from the Auth0 bootstrap so platform consent is fully app-owned.
5. Update canonical docs and targeted unit/integration coverage for actor/session state, authorization errors, navigation redirects, consent completion, and Auth0 bootstrap expectations, then run validation.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Discovery confirmed that exact-version platform-document acceptances are already stored in `user_platform_document_acceptances`; the gap is that actor resolution and normal platform guards still rely on platform-account existence alone.

Current frontend routing already funnels incomplete actors toward `/account/settings`, but there is no re-consent UI yet. Any strict authorization change therefore needs a small in-app consent completion path instead of a dead-end block.

Validation completed with `bun run typecheck`, `bun run test:unit`, targeted unit coverage for auth/navigation/Auth0 bootstrap, targeted integration coverage for actor/account routes, and `bun run lint` (warnings only for existing markdown-rendering `v-html` usage).

Test gap: the full Auth0-backed BDD suite was not run in this pass.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Reworked platform consent into an app-owned completion flow. Backend actor resolution now derives current platform-document acceptance from product data, keeps platform-account existence separate from regular platform access, and blocks normal platform workflows with `platform_consent_required` when the current Privacy Policy and Platform Terms are missing or stale. Added `/account/register` as the dedicated authenticated completion route that either creates the platform account or records missing current document acceptances for an existing account, redirected other `/account/*` routes and hackathon registration entry points through that page, and stopped the public hackathon pages from acting as a bypass into participant workflows.

Auth0 bootstrap now clears the legacy hosted-signup consent custom text and partials so platform consent is no longer collected on the hosted signup screen. Updated canonical docs plus unit/integration coverage for the new actor/session shape, redirect rules, consent gating, and Auth0 bootstrap behavior. Validation ran with `bun run typecheck`, `bun run test:unit`, `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/actor-platform-routes.test.ts`, and `bun run lint` (warnings only for existing markdown-rendering `v-html` usage). The full Auth0-backed BDD suite was not run in this pass.
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
