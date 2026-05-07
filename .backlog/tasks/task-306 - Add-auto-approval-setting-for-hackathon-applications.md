---
id: TASK-306
title: Add auto-approval setting for hackathon applications
status: Done
assignee:
  - codex
created_date: '2026-05-07 16:48'
updated_date: '2026-05-07 17:04'
labels:
  - feature
  - applications
  - hackathons
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/api-surface.md
  - docs/schema-outline.md
modified_files:
  - drizzle/0048_hackathon_auto_approve_applications.sql
  - server/database/schema.ts
  - server/domains/hackathons/index.ts
  - server/domains/applications/review-finalization.ts
  - server/api/hackathons/index.post.ts
  - 'server/api/hackathons/[hackathonId]/applications/index.post.ts'
  - >-
    server/api/hackathons/[hackathonId]/applications/actions/apply-staged-decisions.post.ts
  - app/domains/hackathons/records.ts
  - app/domains/hackathons/presentation.ts
  - app/domains/hackathons/admin-hackathon.ts
  - app/domains/applications/participant-application.ts
  - app/components/admin/HackathonConfigForm.vue
  - app/components/account/hackathons/AccountHackathonAdminSettingsPanel.vue
  - app/components/applications/ParticipantApplicationRegistrationPanel.vue
  - app/pages/admin/hackathons/new.vue
  - 'app/pages/hackathons/[slug]/register.vue'
  - 'app/pages/account/hackathons/[slug]/index.vue'
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/api-surface.md
  - docs/schema-outline.md
  - tests/unit/server/database/schema.test.ts
  - tests/unit/server/domains/hackathons/index.test.ts
  - tests/unit/app/domains/admin-domain-modules.test.ts
  - tests/unit/app/domains/applications/participant-application.test.ts
  - tests/integration/server/api/application-routes.test.ts
  - tests/integration/server/api/hackathon-routes.test.ts
  - tests/integration/server/database/migration.test.ts
priority: medium
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a hackathon-level setting that allows new participant applications to be approved immediately after the existing application submission checks pass. The setting is independent from participantsLimit, applies only to future applications, and preserves the current manual review flow when disabled.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Hackathons persist a non-null auto-approval setting that defaults to false and is exposed through create, update, and serialized hackathon responses.
- [x] #2 When auto-approval is disabled, new applications keep the existing submitted/manual-review behavior.
- [x] #3 When auto-approval is enabled, new applications are stored as approved immediately after existing submission checks pass, with reviewer metadata indicating a system decision.
- [x] #4 Auto-approved applications enqueue the same approval email and Luma approval sync side effects as manually approved applications, with audit metadata identifying auto-approval.
- [x] #5 Turning auto-approval on does not retroactively approve already submitted applications.
- [x] #6 Admin configuration UI lets admins toggle auto-approval from Participation Rules without conflating it with participantsLimit.
- [x] #7 Participant-facing registration copy reflects immediate workspace continuation for auto-approved hackathons.
- [x] #8 Canonical docs describe the setting and its lifecycle/API/schema behavior.
- [x] #9 Unit and integration tests cover persistence, default behavior, auto-approval behavior, and participant copy.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Implementation plan approved by user in the prompt:
1. Add `auto_approve_applications` to the hackathon schema, migration, server validation, serializers, and app-facing hackathon/form types with default `false`.
2. Add the Participation Rules toggle in the admin create/edit settings flows and include the field in create/update payloads.
3. Extract shared application finalization side effects from manual staged approval so both manual approval and auto-approval enqueue review email, enqueue Luma sync when configured, and write audit metadata.
4. Update application submission to choose `submitted` or `approved` from the hackathon setting after all existing submission checks pass; auto-approved records use `reviewedAt = submittedAt`, `reviewedByUserId = null`, `preApprovalStatus = null`.
5. Update participant registration transition/copy to reflect immediate approval when `autoApproveApplications` is true.
6. Update canonical docs for domain, lifecycle, API, and schema behavior.
7. Add/update unit and integration coverage for schema/types/serializers, default manual behavior, auto-approval side effects, non-retroactive toggling, and participant copy.
8. Run `bun run lint`, `bun run typecheck`, and `bun run test:unit` before handoff; also run targeted integration tests if practical.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented hackathon auto-approval as a future-application-only setting independent from `participantsLimit`. New auto-approved submissions are inserted as `approved` with `reviewedAt = submittedAt`, no reviewing user, and shared approval email/Luma sync/audit finalization.

Validation passed: `bun run lint`, `bun run typecheck`, `bun run test:unit`, `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/application-routes.test.ts tests/integration/server/database/migration.test.ts`, and `bunx vitest run --config vitest.integration.config.ts tests/integration/server/api/hackathon-routes.test.ts -t "PATCH /api/hackathons/:hackathonId updates configuration"`.

No setup, developer workflow, auth, or permission model changes were required for this task. A full `hackathon-routes.test.ts` run is currently affected by unrelated concurrent event-organizer identity fixture edits in the worktree, so focused coverage was used for the auto-approval update/toggle behavior.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a hackathon-level `autoApproveApplications` setting across persistence, validation, serializers, admin forms, participant copy, canonical docs, and tests. Application submission now approves future applications immediately when the setting is enabled and reuses the same approval email, Luma sync, and audit path as manual staged approvals. Existing submitted applications are unchanged when the setting is toggled on.
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
