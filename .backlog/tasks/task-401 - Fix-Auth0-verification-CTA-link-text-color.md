---
id: TASK-401
title: Fix Auth0 verification CTA link text color
status: Done
assignee:
  - '@codex'
created_date: '2026-06-14 16:50'
updated_date: '2026-06-14 16:57'
labels:
  - auth0
  - deployment
dependencies: []
modified_files:
  - tools/auth0/auth0-bootstrap.ts
  - tests/unit/tools/auth0/auth0-bootstrap.test.ts
priority: medium
ordinal: 80000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Auth0 email verification success pages can render the primary CTA as an anchor styled like a button. The canonical Universal Login page template currently forces all links to the brand primary color, so the CTA text can become invisible on the dark primary button after each production bootstrap sync.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Auth0 Universal Login template keeps normal text links in the brand primary color.
- [x] #2 Auth0 anchor-style primary CTAs receive the primary button label color so email verification success buttons remain readable after deployment sync.
- [x] #3 Unit tests cover the generated template rules for both normal links and anchor-style button CTAs.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the canonical Universal Login page template CSS so normal links use a low-specificity brand-color default, allowing Auth0 button-specific styling to override it.
2. Keep semantic button and role=button elements on the configured primary button label color.
3. Extend the Auth0 bootstrap unit test to assert normal links and anchor-style button CTAs get distinct rules.
4. Run lint, typecheck, unit, integration, BDD, and diff whitespace validation.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Changed the generated Universal Login page template so normal anchors use :where(...) without !important. This keeps plain links brand-colored without overriding Auth0 anchor CTAs styled as primary buttons. Added an explicit a[role="button"] selector to the primary button label-color rule and updated the focused unit test.

Validation passed: bun test tests/unit/tools/auth0/auth0-bootstrap.test.ts; bun run lint; bun run typecheck; bun run test:unit; bun run test:integration; git diff --check. bun run test:bdd was attempted twice and failed outside this change: first in the destructive phase because regular_user storage state was missing after bootstrap, then in authenticated team workspace/submission scenarios because local D1 fixture reset commands reported missing tables such as users and event_role_assignments.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated Auth0 bootstrap's canonical Universal Login template so production deploys no longer reapply a global important link color that can hide email verification CTA text. Normal links still receive the brand primary color, while semantic button/role CTAs receive the configured primary button label color and Auth0 button classes can override the low-specificity link default. Focused unit coverage was updated; lint, typecheck, unit, integration, and diff whitespace checks passed. BDD was attempted twice but remains blocked by unrelated local BDD auth/D1 fixture instability.
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
