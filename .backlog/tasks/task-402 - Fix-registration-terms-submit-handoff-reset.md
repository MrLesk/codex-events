---
id: TASK-402
title: Fix registration terms submit handoff reset
status: Done
assignee:
  - '@codex'
created_date: '2026-06-14 16:50'
updated_date: '2026-06-14 17:01'
labels: []
dependencies: []
modified_files:
  - app/domains/accounts/registration.ts
  - app/pages/account/register.vue
  - tests/unit/app/domains/accounts/registration.test.ts
ordinal: 81000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After a participant accepts registration terms and submits, the UI should not briefly reset or show validation-like feedback before the successful redirect completes. The submit path should keep a stable pending/success handoff state until navigation or show actionable feedback only on real submission failure.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Submitting after accepting required registration terms keeps the form in a stable pending or success handoff state until redirect
- [x] #2 The submit path does not show transient validation/reset UI after the successful request has been accepted
- [x] #3 Submission failures remain on the registration page with clear actionable feedback
- [x] #4 Relevant tests or focused regression coverage are added or updated
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a small account-registration completed transition helper and unit coverage for its copy/target.
2. Update app/pages/account/register.vue so successful platform consent or first-admin setup switches to that transition before session refresh/navigation, and only returns to the editable form on real submission failure.
3. Run focused unit coverage plus the project validation suite required for account/Auth0 browser flow changes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added an account-registration completed handoff state and render branch so successful consent hides the editable form before session refresh and redirect can re-render the page.

Validation passed: bun run lint, bun run typecheck, bun run test:unit, bun run test:integration, and bun run test:bdd on rerun. The first BDD attempt passed the initial 47 scenarios but failed during the second Auth0 bootstrap before destructive scenarios; the immediate rerun passed all BDD phases. In-app browser sanity check reached the expected Auth0 login redirect from /account/register with no console errors before auth.

Canonical docs and config were confirmed unchanged.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed the account registration consent submit handoff so a successful POST switches to an explicit completed state before session refresh and redirect work. This prevents the consent form from briefly reappearing or looking reset after the server has accepted the Privacy Policy and Platform Terms.

Added helper coverage for the completed handoff target/copy. Verified with lint, typecheck, unit, integration, BDD rerun, and a lightweight in-app browser auth-redirect sanity check.
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
