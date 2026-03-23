---
id: TASK-4.3
title: 'Build platform account registration, profile, and deletion flows'
status: Done
assignee:
  - Codex
created_date: '2026-03-22 22:09'
updated_date: '2026-03-23 00:07'
labels:
  - frontend
  - ui
  - account
milestone: m-1
dependencies:
  - TASK-3
documentation:
  - docs/domain-model.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
  - docs/testing-strategy.md
  - docs/design-reference.md
parent_task_id: TASK-4
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the account lifecycle surfaces that connect Auth0 authentication to the platform user model, required platform-document acceptance, profile completion, and GDPR-aware account deletion. This is required because platform access and hackathon application eligibility depend on platform-side user data.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Newly authenticated users can complete platform account registration with exact-version acceptance of the required current platform documents.
- [x] #2 Authenticated users can view and update the profile fields that affect hackathon application eligibility, including X, LinkedIn, and GitHub links.
- [x] #3 Authenticated users can complete the documented account-deletion flow from the UI.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a small account/session data layer in the app that consumes `/api/session` and current platform documents so the UI can distinguish authenticated identities without platform accounts from full platform users.
2. Implement the missing support APIs required by this task: platform account registration and account profile update, reusing the existing session and document-acceptance model.
3. Build an onboarding flow under `app/pages/onboarding/**` for authenticated identities without platform accounts, including exact-version platform document acceptance.
4. Build account settings under `app/pages/account/**` for display name and X, LinkedIn, and GitHub profile links, plus a guarded account deletion flow using the existing delete endpoint.
5. Add validation coverage for registration/profile flows and update BDD coverage for the actor/account lifecycle where appropriate.
6. Update canonical docs only if implementation exposes a real spec mismatch that needs to be made explicit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Discovery completed before implementation. Confirmed reusable backend/account primitives: GET /api/session, GET /api/platform-documents/current, POST /api/platform-document-acceptances, DELETE /api/account. Confirmed gap against canonical docs and TASK-4.3 acceptance criteria: no implemented API route for POST /api/account/registration and no implemented account profile read/update route. Waiting for supervisor plan approval before recording the implementation plan or starting code changes.

Approved plan recorded before implementation. Scope remains tightly limited to TASK-4.3 account registration/profile/deletion behavior and the minimal backend support required by that UI.

Implemented the task-scoped account lifecycle slice without taking ownership of shell files. Added `POST /api/account/registration` and `PATCH /api/account`, updated the account-management utility for exact-version registration acceptance and profile updates, added `/onboarding/account` and `/account` routes plus account-scoped composables, and updated integration plus destructive BDD coverage for registration, profile editing, and UI-driven account deletion/recreation.

Validation completed for the task slice: `bunx vitest run tests/unit/server/utils/account-management.test.ts`, `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/actor-platform-routes.test.ts`, `bunx eslint app/composables/useAccountLifecycleActor.ts app/composables/useCurrentPlatformDocuments.ts app/pages/account/index.vue app/pages/onboarding/account.vue server/utils/account-management.ts server/api/account.patch.ts server/api/account/registration.post.ts tests/integration/server/api/actor-platform-routes.test.ts tests/bdd/steps/account-management.steps.ts`, and `node --experimental-strip-types tests/bdd/bootstrap.ts && bunx bddgen && bunx playwright test tests/bdd/features/authenticated-destructive/account-management.feature --project chromium-authenticated-destructive-bdd --workers=1` all passed.

Repo-wide `bun run typecheck` remains blocked by concurrent work outside TASK-4.3 in `app/composables/useShellNavigation.ts`, `app/pages/judging/index.vue`, and `app/pages/prize-redemptions/index.vue`. Coordination note applied: dashboard integration was left to TASK-4.1, and the account flow uses the task-scoped `useAccountLifecycleActor` helper rather than a shared shell actor primitive.

Independent review found follow-up fixes before TASK-4.3 can be treated as clean: key/watch the account actor composable by authenticated subject to avoid stale cross-session data, and expand automated coverage for the new account registration/profile backend guard paths (invalid/outdated document IDs, profile updates without a platform account, and display-name update behavior).

Addressed independent review findings: `useAccountLifecycleActor` now keys and watches its `/api/session` fetch on the authenticated Auth0 subject to avoid stale shared-cache state when account/onboarding routes resolve actor data. Expanded integration coverage for the scoped backend support to include registration rejection for outdated and mismatched platform document ids, rejection of `PATCH /api/account` for authenticated identities without a platform account, and a display-name-only update path that preserves existing optional profile URLs.

Follow-up validation after the review fixes passed: `bunx eslint app/composables/useAccountLifecycleActor.ts server/utils/account-management.ts tests/integration/server/api/actor-platform-routes.test.ts`, `bunx vitest run tests/unit/server/utils/account-management.test.ts`, `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/actor-platform-routes.test.ts`, and `node --experimental-strip-types tests/bdd/bootstrap.ts && bunx bddgen && bunx playwright test tests/bdd/features/authenticated-destructive/account-management.feature --project chromium-authenticated-destructive-bdd --workers=1`.

Second independent review after follow-up fixes found no remaining findings. The account actor composable now keys/watches by authenticated subject, and the backend guard-path coverage for account registration/profile updates has been expanded.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Delivered the canonical account lifecycle slice for the UI milestone. Added the missing backend support required by the task with `POST /api/account/registration` for authenticated identities without platform accounts and `PATCH /api/account` for platform-user profile updates, both aligned with the platform-side authorization model and exact-version platform document acceptance rules. Extended the account management utility layer to enforce current document versions, normalize optional profile URLs, write audit records for registration and profile updates, and keep account deletion behavior intact.

Built the user-facing account routes under `/onboarding/account` and `/account` so authenticated identities can create a platform account, accept the current privacy policy and platform terms, update display name plus X, LinkedIn, and GitHub links, and delete the platform account through the UI before recreating it if needed. The implementation intentionally stayed out of shell-owned files after coordination with TASK-4.1; shared dashboard integration is left to that task, and the account flow uses the task-scoped `useAccountLifecycleActor` helper rather than a shared shell actor primitive.

Updated canonical API documentation in `docs/api-surface.md` to record the profile-update route and testing expectations. Validation for the task slice passed with unit coverage for account utilities, focused integration coverage for the account/session routes, targeted ESLint on the changed code, and a destructive Auth0-backed BDD scenario that deletes the platform account through the UI, recreates it through onboarding, and updates the profile links. Residual risk is outside TASK-4.3: repository-wide `bun run typecheck` is currently blocked by concurrent work in `app/composables/useShellNavigation.ts`, `app/pages/judging/index.vue`, and `app/pages/prize-redemptions/index.vue`, not by the account-lifecycle changes in this task.

Follow-up review fixes were completed after the initial handoff. The account actor helper now keys and watches its `/api/session` request by authenticated Auth0 subject so account and onboarding routes do not rely on stale shared-cache data when identities change or recover from deletion. The backend support coverage was expanded to include rejection of outdated and mismatched document ids during platform account registration, rejection of profile updates for authenticated identities without a platform account, and a display-name-only update path that preserves existing optional profile URLs.

Focused validation for the follow-up fixes passed with ESLint on the account actor helper and updated integration test file, the account-management unit test, the expanded actor-platform integration suite, and the destructive Auth0-backed BDD scenario for UI deletion, recreation, and profile updates. The task is ready for a second review.

Follow-up review fixes made the account actor cache subject-aware and expanded backend guard-path coverage for account registration/profile updates. A second independent review found no remaining findings; residual risk is limited to broader browser-level onboarding/error-state coverage outside this task's focused destructive account-management scenario.
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
