---
id: TASK-18
title: >-
  Add ChatGPT email and OpenAI org ID requirement support across hackathon
  configuration and application flows
status: Done
assignee:
  - '@Codex'
created_date: '2026-03-24 20:47'
updated_date: '2026-03-24 20:56'
labels: []
dependencies: []
references:
  - README.md
  - DEVELOPMENT.md
documentation:
  - docs/domain-model.md
  - docs/api-surface.md
  - docs/schema-outline.md
  - docs/permissions-matrix.md
  - docs/lifecycle-and-state-machines.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extend the canonical hackathon participant-profile model to support a `chatgpt` email field and an `openai` organization ID field on platform users, plus matching hackathon configuration flags that can require each field for applications. Keep the new fields consistent across canonical docs, persistent schema, backend serialization and validation, admin hackathon configuration surfaces, participant account/profile surfaces, public hackathon presentation, application eligibility checks, and automated test fixtures, following the same cross-surface pattern used for `TASK-15` Luma support.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Canonical product docs and schema/API docs describe the ChatGPT email and OpenAI org ID profile fields plus `requireChatgptEmail` and `requireOpenaiOrgId` hackathon flags alongside the existing required-profile fields.
- [x] #2 Platform user storage, session/account serialization, and hackathon serialization include the ChatGPT email, OpenAI org ID, and matching required-profile flags with consistent semantics.
- [x] #3 Hackathon create/update APIs and application eligibility validation accept and enforce `requireChatgptEmail` and `requireOpenaiOrgId`, and missing required profile data blocks application submission.
- [x] #4 Admin hackathon configuration UI and participant account/onboarding/application/public hackathon UI surfaces expose the new fields and requirements consistently with the existing profile requirement UX.
- [x] #5 Automated coverage is updated for the new fields across unit, integration, and relevant BDD or fixture tests.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend the canonical docs and schema model with platform-user fields `chatgptEmail` / `openaiOrgId` and hackathon flags `requireChatgptEmail` / `requireOpenaiOrgId`, including a forward migration.
2. Propagate the new fields through backend validation and serialization: account registration/profile updates, session actor payloads, hackathon create/update payloads, public/admin hackathon reads, and application eligibility checks.
3. Update participant and admin UI surfaces that expose profile requirements: onboarding, account settings, admin hackathon configuration, public hackathon requirement presentation, participant application requirement messaging, and admin application review.
4. Update unit, integration, and BDD or fixture coverage for the new fields, then run targeted validation followed by the fast project checks.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Started scoped discovery by tracing the existing TASK-15 Luma implementation across docs, schema, backend serializers, participant requirement helpers, admin configuration surfaces, and test fixtures to reuse the same cross-surface pattern for the new profile fields.

Implemented `chatgptEmail` / `chatgpt_email` and `openaiOrgId` / `openai_org_id` on platform users plus `requireChatgptEmail` / `require_chatgpt_email` and `requireOpenaiOrgId` / `require_openai_org_id` on hackathons, following the same mirrored-field pattern as TASK-15.

Updated canonical docs, the Drizzle schema, a forward migration, account and session serialization, hackathon create or update validation, public and admin hackathon serialization, and application eligibility enforcement so missing required ChatGPT email or OpenAI org ID blocks application submission.

Updated the current participant-facing registration and profile surfaces to match the post-TASK-16 auth flow: `/auth/access` now collects and persists ChatGPT email and OpenAI org ID through the app-owned pre-auth registration intent, while `/account` edits both fields directly. Admin hackathon configuration, public requirement presentation, participant missing-profile messaging, and admin application review were updated in parallel.

Updated automated coverage in unit, integration, and BDD fixture layers. One integration helper needed its batch size reduced from 5 to 4 because the added hackathon columns pushed the generated insert statements over D1's SQL variable limit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added ChatGPT email and OpenAI org ID support across the same cross-surface seams used for TASK-15. Platform users can now store `chatgptEmail` and `openaiOrgId`, hackathons can require `requireChatgptEmail` and `requireOpenaiOrgId`, and application submission now rejects users missing either required field.

The change was propagated through canonical docs, schema and migration (`drizzle/0005_chatgpt_email_openai_org_requirements.sql`), account registration/profile validation, session and hackathon serializers, admin hackathon configuration, public requirement presentation, participant missing-profile messaging, and admin application review. The current app-owned registration flow at `/auth/access` was updated to carry the two new fields through the local registration intent and authenticated account-creation step so the registration UX remains aligned with the newer pre-auth acceptance flow.

Validation passed for `bun run typecheck`, `bun run lint`, `bun run test:unit`, and `bun run test:integration`. Relevant BDD fixtures and steps were updated, but the full Auth0-backed `bun run test:bdd` suite was not run in this turn; that is the remaining optional follow-up if you want end-to-end confirmation of the updated `/auth/access` and fixture flows.
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
