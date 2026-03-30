---
id: TASK-124
title: Add company and bio to platform account profile settings
status: Done
assignee:
  - Codex
created_date: '2026-03-30 18:15'
updated_date: '2026-03-30 18:23'
labels: []
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/schema-outline.md
  - docs/api-surface.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add two new optional platform-user profile fields, `company` and `bio`, to the canonical account profile surface. The change should include the D1 schema/migration work needed for persistence, let a platform user view and edit these fields from account profile settings, use a single-line field for company and a multiline field for bio, and keep onboarding/account-registration scope unchanged unless required for the account-settings flow to function correctly with the existing model.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Account profile APIs and session actor payloads include optional `company` and `bio` values for platform users so the settings page can read and save them.
- [x] #2 The account settings page displays editable `Company` and multiline `Bio` fields and preserves saved values after refresh.
- [x] #3 The change does not broaden onboarding/profile-setup UI beyond account settings unless that is required for consistency with the existing account-settings implementation.
- [x] #4 Canonical docs and automated coverage are updated for the new platform-user profile fields.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend the platform account profile contract to include optional `company` and `bio` in the D1 users schema, migration, account update schema, serialized platform-user shape, and session actor payload, using the existing trim-to-null normalization pattern.
2. Keep onboarding scope unchanged by introducing an account-settings-specific frontend validation schema, then add a single-line Company field and multiline Bio field only to the account settings form and page state.
3. Update canonical docs for the platform-user profile model and extend account-profile tests and account-settings BDD coverage to verify save and reload behavior for the new fields.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Validation showed the D1-backed unit harness fails without real `users.company` and `users.bio` columns, so the task scope was corrected to include the D1 migration needed for persistence and passing local checks.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added optional `company` and `bio` platform-user profile fields end to end. The D1 users schema and migration now include both columns, the account profile update flow and session actor payload serialize them, and account settings exposes a single-line Company field plus a multiline Bio field without broadening the onboarding/profile-setup UI. Canonical product docs and platform legal copy were updated to reflect the new profile surface.

Validation and coverage were updated alongside the change. Unit coverage now checks the new schema fields, account-profile API tests and BDD account-settings steps include company/bio expectations, and the fake D1 test harness was hardened to ignore Cloudflare-owned `_cf_*` tables when clearing shared test databases because the new migration exposes `_cf_METADATA` during resets. Validation run: `bun run lint` (passes with the repo's existing 6 `vue/no-v-html` warnings on legal/content pages), `bun run typecheck`, and `bun run test:unit`.
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
