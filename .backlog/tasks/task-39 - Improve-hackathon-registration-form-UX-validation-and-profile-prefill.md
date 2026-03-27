---
id: TASK-39
title: 'Improve hackathon registration form UX, validation, and profile prefill'
status: Done
assignee: []
created_date: '2026-03-27 18:17'
updated_date: '2026-03-27 18:26'
labels: []
dependencies: []
documentation:
  - /Users/alex/projects/codex-hackathons/docs/domain-model.md
  - /Users/alex/projects/codex-hackathons/docs/permissions-matrix.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the participant registration page to reduce form friction and align field behavior with user expectations. The page should use inline field-level validation, clear required indicators, accurate teammate limits based on max team size, stronger input validation, mobile-friendly submit affordances, and integrated profile management conveniences including prefill and profile icon upload.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Registration form shows validation errors directly under each invalid field instead of global error stacks for missing required fields
- [x] #2 Required fields are labeled with a REQUIRED visual chip style distinct from the hackathon state badge
- [x] #3 When applying as a team, teammate hint slots are capped at maxTeamMembers minus one (the applicant counts as one member)
- [x] #4 Registration form validates field formats inline (including URL and email fields, plus OpenAI org ID format) and blocks submit until valid
- [x] #5 Mobile registration view includes a sticky submit affordance that remains accessible while scrolling and communicates submission readiness
- [x] #6 Registration form includes first name and last name fields for the applicant profile
- [x] #7 Profile icon can be uploaded from the registration page using the existing account profile icon flow
- [x] #8 Registration form pre-fills available user profile fields from the platform account data and allows editing before submit
- [x] #9 The existing registration submission flow remains functional and persists the same application payload semantics for team intent and teammate hints
- [x] #10 Unit tests are updated or added to cover new field behavior and validation rules for the registration experience
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1) Update participant registration helpers and tests for teammate-hint cap and additional profile validation utilities.
2) Refactor the registration panel UI to add first/family name fields, REQUIRED chips, inline field errors, and mobile sticky submit readiness UI.
3) Integrate profile icon upload and account prefill behavior on the registration page using existing account/profile-icon APIs.
4) Validate with unit tests and typecheck, then verify key registration interactions in-browser.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented registration teammate hint cap as maxTeamMembers - 1 in both row generation and submission normalization.

Added display-name split/compose helpers to prefill first/family name fields while persisting canonical displayName through account profile updates.

Implemented inline per-field validation for required, URL, email, and OpenAI org ID format checks; removed global missing-profile error stack from registration form.

Added REQUIRED chips for required fields and mobile sticky submit readiness status with disabled CTA when validation/policy guards fail.

Added profile icon upload surface to register page by reusing existing /api/account/profile-icon flow and account actor refresh.

Verified live register page behavior: first/family prefill, REQUIRED chips, teammate label shows up to 3 when max team size is 4, and sticky mobile submit readiness bar appears.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented TASK-39 by upgrading the hackathon registration experience across shared helpers, page orchestration, and the registration panel UI.

What changed:
- Updated participant registration helper logic to cap teammate hint rows and submitted teammate hints at `maxTeamMembers - 1` (applicant counts as one member).
- Added reusable helper utilities for OpenAI org ID format validation and display-name split/compose.
- Extended the registration page profile form model with `firstName` and `familyName`, prefilled from existing account display name, and persisted back through the existing account update API as a composed canonical `displayName`.
- Added profile icon upload controls directly on the register page using the existing `/api/account/profile-icon` endpoint and actor refresh flow.
- Refactored the registration panel to replace global missing-field alerts with inline field-level validation errors, REQUIRED chips, improved credit-field explanatory copy, and per-teammate email validation.
- Added a sticky mobile submit bar that shows submission readiness text and keeps submit action visible while scrolling.

Validation:
- `bun run test:unit` passed.
- `bun run typecheck` passed.
- Manual browser verification on `/hackathons/codex-singapore-2026-03-28/register` confirmed: REQUIRED chips, inline errors, teammate cap label (`up to 3` for team size 4), first/family name prefill, register-page profile icon UI, and mobile sticky submit readiness bar.

Risk / follow-up:
- First/family names are currently captured in the registration UI and persisted via composed `displayName` (no schema split fields yet). If separate canonical storage is desired, that should be handled as an explicit domain+schema task.
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
