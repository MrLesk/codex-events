---
id: TASK-341
title: Improve first admin setup registration UI
status: Done
assignee:
  - codex
created_date: '2026-05-31 17:20'
updated_date: '2026-05-31 17:27'
labels:
  - account
  - ui
dependencies: []
modified_files:
  - server/auth/actor.ts
  - server/api/session.get.ts
  - server/domains/accounts/index.ts
  - server/domains/platform/admins.ts
  - app/domains/accounts/session-actor.ts
  - app/domains/accounts/registration.ts
  - app/pages/account/register.vue
  - tests/integration/server/api/actor-platform-routes.test.ts
  - tests/unit/app/domains/accounts/registration.test.ts
priority: medium
ordinal: 44000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When a signed-in identity is eligible to create the first platform admin account before legal documents exist, the account registration page should present that as a setup flow instead of showing the regular-registration legal-content warning.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The registration page can distinguish the configured first platform admin setup identity from regular authenticated identities.
- [x] #2 The first platform admin setup state does not show the regular "Legal content required" warning.
- [x] #3 Regular authenticated identities and non-admin platform users still see the legal-content block when platform legal documents are missing.
- [x] #4 Relevant account-registration tests cover the setup eligibility signal and copy selection.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Expose a server-derived first-platform-admin setup eligibility flag on authenticated identity actors and include it in /api/session responses.
2. Add account-registration copy helpers for missing-legal-documents states so the first admin setup state uses neutral setup copy while regular blocked states keep the legal-content warning.
3. Update /account/register.vue to choose the intro, alert, helper text, and button state from that explicit actor flag.
4. Add focused unit/integration coverage for the new copy helper and /api/session eligibility signal, then run lint, typecheck, unit tests, and integration tests because this touches account/Auth0-backed flow behavior.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented as a server-derived setup eligibility signal on authenticated identity actors instead of frontend email/config guessing. The registration page now uses account-domain copy for the missing-legal-documents state and only shows the setup action to eligible first-platform-admin identities or existing platform admins.

Validation: bun run lint passed; bun run typecheck passed; bun run test:unit passed; bun run test:integration passed; git diff --check passed. bun run test:bdd was attempted but failed during fixture bootstrap before browser tests because existing BDD fixture SQL inserts judge_criterion_scores values 6-9 while the current schema enforces score between 1 and 5.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added an explicit first-platform-admin setup eligibility signal to authenticated identity actors and /api/session responses. The account registration page now uses that signal to show neutral first-platform-admin setup copy and a Create admin account action when legal documents are missing, while regular authenticated identities still see the legal-content block and no setup action. The setup eligibility logic is shared with the registration document-bypass path through the platform admin domain helper.

Tests updated for the registration copy helper and the /api/session eligibility signal. Validation passed for lint, typecheck, unit tests, integration tests, and diff whitespace checks. BDD was attempted but is blocked before browser execution by an existing fixture/schema mismatch: BDD fixture SQL inserts judge criterion scores outside the current 1-5 score constraint.
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
