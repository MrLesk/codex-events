---
id: TASK-43
title: Migrate all app forms to vee-validate + zod as canonical frontend validation
status: Done
assignee: []
created_date: '2026-03-27 19:18'
updated_date: '2026-03-27 19:26'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Adopt vee-validate + zod across all website forms and remove custom/manual frontend validation flows. Keep backend zod validation as-is and align client schemas with canonical server contracts.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `vee-validate` and `@vee-validate/zod` are installed and used as the canonical frontend form-validation stack.
- [x] #2 Each current `<form>` component in `app/components/**` is migrated to `vee-validate + zod`.
- [x] #3 Existing custom manual validation logic in form components is removed.
- [x] #4 Form submission emits/actions only execute when vee-validate reports a valid form.
- [x] #5 Typecheck and unit tests pass after migration.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Migration inventory (all `<form>` components):

1) app/components/account/AccountSettingsProfileForm.vue

2) app/components/account/PlatformAccountProfileForm.vue

3) app/components/public/hackathons/HackathonRegistrationPanel.vue

4) app/components/teams/ParticipantTeamDirectoryPanel.vue

5) app/components/teams/ParticipantTeamWorkspacePanel.vue

6) app/components/teams/ParticipantTeamSubmissionPanel.vue

7) app/components/admin/HackathonConfigForm.vue

Installed `vee-validate@4.15.1` and `@vee-validate/zod@4.15.1` and wired all `<form>` components in `app/components/**` to `useForm` + `toTypedSchema(zodSchema)`.

Added canonical frontend schemas in `app/utils/form-schemas.ts` and shared cloning helper in `app/utils/form-values.ts`.

Migrated components: AccountSettingsProfileForm, PlatformAccountProfileForm, HackathonRegistrationPanel, ParticipantTeamDirectoryPanel, ParticipantTeamWorkspacePanel, ParticipantTeamSubmissionPanel, HackathonConfigForm.

Removed handcrafted registration-panel validation engine; registration now validates through `vee-validate + zod` schema and field-path errors.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Canonical frontend validation migration completed for all component-level forms (`<form>` elements) using `vee-validate + zod`.

What changed:
- Installed and adopted `vee-validate` + `@vee-validate/zod`.
- Added shared schemas and helpers:
  - `app/utils/form-schemas.ts`
  - `app/utils/form-values.ts`
- Migrated all 7 form components to `useForm` + zod schemas:
  1) `app/components/account/AccountSettingsProfileForm.vue`
  2) `app/components/account/PlatformAccountProfileForm.vue`
  3) `app/components/public/hackathons/HackathonRegistrationPanel.vue`
  4) `app/components/teams/ParticipantTeamDirectoryPanel.vue`
  5) `app/components/teams/ParticipantTeamWorkspacePanel.vue`
  6) `app/components/teams/ParticipantTeamSubmissionPanel.vue`
  7) `app/components/admin/HackathonConfigForm.vue`
- Removed custom registration validation computations that directly enforced rules; now those rules are encoded in zod schema and surfaced via vee-validate errors.

Validation:
- `bun run typecheck` passed
- `bun run test:unit` passed

Docs/config impact:
- No canonical product docs change required.

Risks/follow-ups:
- `@vee-validate/zod` currently warns about zod peer-range expectations with zod v4 in install output; runtime/typecheck pass locally. Keep this pinned/monitored during future dependency upgrades.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical docs were updated or confirmed unchanged
- [x] #2 Code behavior matches canonical docs
- [x] #3 Relevant validation commands pass
- [x] #4 Tests were added or updated when behavior changed
- [x] #5 Test gaps are documented when automation is not practical
- [ ] #6 Config and developer workflow docs were updated when setup changed
- [x] #7 Auth and permissions changes follow the documented platform model
- [x] #8 Risks and follow ups are recorded in the task summary
<!-- DOD:END -->
