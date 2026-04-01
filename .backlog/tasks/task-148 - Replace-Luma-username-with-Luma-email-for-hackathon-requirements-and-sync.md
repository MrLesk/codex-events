---
id: TASK-148
title: Replace Luma username with Luma email for hackathon requirements and sync
status: Done
assignee:
  - codex
created_date: '2026-04-01 20:52'
updated_date: '2026-04-01 21:06'
labels:
  - luma
  - profile
  - hackathon
  - admin
  - migration
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Switch the platform from collecting and requiring Luma usernames to collecting and requiring Luma emails. Preserve the legacy lumaUsername field only for already-registered users, add a new lumaEmail field to user profiles, update participant and account flows to collect Luma email only, add a temporary admin backfill endpoint to populate Luma email for legacy users from their stored Luma usernames, and update final approval/rejection sync to Luma to use the stored Luma email. No runtime fallback from Luma email back to username is allowed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 User profiles store a new optional Luma email field while retaining the existing Luma username field for legacy data.
- [x] #2 Hackathon configuration and participant requirements use the renamed existing requirement flag as a Luma email requirement without a data migration for existing hackathons.
- [x] #3 Participant registration and account profile forms collect and validate Luma email with an email input and no longer collect Luma username for new edits.
- [x] #4 A temporary admin-only endpoint can backfill Luma email for legacy users from stored Luma usernames using the existing event-scoped lookup approach.
- [x] #5 Luma approval and rejection sync uses stored Luma email directly and does not fall back to username at runtime.
- [x] #6 Relevant docs and automated tests are updated to reflect the Luma email model and migration flow.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a new nullable lumaEmail field to the user model, account/session serializers, and client-facing profile types while keeping lumaUsername only as legacy stored data.
2. Rename the hackathon requirement concept in code from requireLumaProfile to requireLumaEmail while continuing to read and write the existing require_luma_profile database column so existing hackathons automatically keep the requirement.
3. Replace account and registration forms plus participant requirement presentation to collect and validate Luma email only, using email inputs and removing Luma username editing from normal user flows.
4. Add a temporary admin-only backfill endpoint that resolves each eligible user's stored lumaUsername against the hackathon's configured Luma event, writes lumaEmail on success, and reports failures for manual follow-up.
5. Update the Luma approval/rejection queue worker to require stored lumaEmail and use it directly for guest lookup/status updates with no runtime fallback to username.
6. Update admin participant views, docs, and tests to reflect the Luma email model and the manual backfill workflow.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented the canonical Luma email cutover by adding users.luma_email, renaming the hackathon requirement flag in code to requireLumaEmail while keeping the existing require_luma_profile column, and updating account and registration flows to collect Luma email only.

Added a platform-admin operational route at /api/admin/hackathons/:hackathonId/actions/backfill-luma-emails that resolves legacy lumaUsername values against the configured Luma event and writes lumaEmail for users who still need it.

Switched async Luma approval/rejection sync to use stored lumaEmail only with no runtime fallback to username, while retaining the username-based resolver only for the admin backfill path.

Validation passed locally: bun run lint, bun run typecheck, bun run test:unit, and bun run test:integration -- tests/integration/server/api/application-routes.test.ts tests/integration/server/api/actor-platform-routes.test.ts tests/integration/server/api/admin-luma-backfill-routes.test.ts.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added canonical Luma email support across the platform and removed username-based Luma behavior from normal user flows. Users now store a nullable `lumaEmail` while retaining legacy `lumaUsername`, hackathons require `requireLumaEmail` in code while continuing to use the existing `require_luma_profile` column, and account plus registration forms now collect only Luma email.

Implemented a platform-admin backfill route at `/api/admin/hackathons/:hackathonId/actions/backfill-luma-emails` so legacy users in a Luma-enabled hackathon can be migrated from stored usernames to canonical Luma emails using the existing event-scoped lookup approach. The async Luma approval/rejection worker now reads only `lumaEmail` for guest resolution and status updates, with no runtime fallback to username.

Updated canonical docs, README runtime guidance, migration SQL, and automated coverage. Local validation passed with `bun run lint`, `bun run typecheck`, `bun run test:unit`, and a targeted integration run for the changed API routes and new backfill endpoint. Residual risk remains limited to the legacy backfill path's dependence on Luma public profile HTML continuing to expose the username-to-user-id mapping needed for one-time migration.
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
