---
id: TASK-15
title: >-
  Add Luma profile requirement support across hackathon configuration and
  application flows
status: Done
assignee:
  - Codex
created_date: '2026-03-24 20:32'
updated_date: '2026-03-24 20:41'
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
Extend the canonical hackathon participant-profile model to support a `luma` profile URL on platform users and a matching hackathon configuration flag that can require a Luma profile for applications. This must remain consistent across canonical docs, persistent schema, backend serialization and validation, admin hackathon configuration surfaces, participant account/profile surfaces, public hackathon presentation, application eligibility checks, and automated test fixtures.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Canonical product docs and schema/API docs describe the Luma profile URL and `requireLumaProfile` hackathon flag alongside the existing X, LinkedIn, and GitHub profile fields.
- [x] #2 Platform user storage, session/account serialization, and hackathon serialization include the Luma profile URL and `requireLumaProfile` flag with the same semantics as the existing required-profile fields.
- [x] #3 Hackathon create/update APIs and application eligibility validation accept and enforce `requireLumaProfile`, and missing Luma profile data blocks application submission when required.
- [x] #4 Admin hackathon configuration UI and participant account/onboarding/application/public hackathon UI surfaces expose the Luma profile field and requirement consistently with the existing profile links.
- [x] #5 Automated coverage is updated for the new field across unit, integration, and relevant BDD or fixture tests.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update canonical docs so platform users can store a Luma username and hackathons can require that username during application submission.
2. Extend the persistent model and API contracts with `luma_username` on users and `require_luma_profile` on hackathons, then propagate the new fields through backend serialization, session payloads, account/profile updates, and hackathon create/update handlers.
3. Update participant and admin UI surfaces to edit, display, and enforce the Luma username requirement alongside the existing social profile requirements, using username semantics instead of URL semantics.
4. Update unit, integration, fixture, and BDD coverage for the new field, then run targeted validation for the changed areas.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Discovery brief: profile support is implemented as mirrored fields on `users` and `hackathons`, then propagated through backend serializers, session/account actor shapes, admin config forms, participant account/onboarding/application utilities, public hackathon presentation helpers, and test fixtures. The main risk is missing one of the duplicated front-end type/serialization surfaces and creating UI drift even if backend enforcement works.

User clarified that Luma should be modeled as a username field rather than a profile URL. Implementation will use `lumaUsername` / `luma_username` semantics while retaining the existing hackathon required-profile boolean pattern via `requireLumaProfile` / `require_luma_profile`.

Implemented `lumaUsername` / `luma_username` on platform users and `requireLumaProfile` / `require_luma_profile` on hackathons. The field is modeled as a username rather than a URL, per product clarification.

Updated canonical docs, backend schema and serializers, admin config flows, participant account/onboarding/application helpers, and BDD fixtures so the new requirement behaves like the existing profile requirements without introducing a separate flow.

Validation run: `bun run typecheck`, `bun run lint`, `bun run test:unit`, `bun run test:integration`. Fast surfaces all passed after adding explicit integration coverage for account/profile round-tripping and application rejection on missing Luma username.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added Luma profile support to the canonical hackathon participant-profile model using username semantics rather than URL semantics. Platform users can now store `lumaUsername`, hackathons can require `requireLumaProfile`, and the backend propagates both fields through schema definitions, account/session serialization, hackathon create/update contracts, team/application serializers, and application eligibility enforcement.

Updated the participant and admin UI surfaces to keep the new field consistent across the flow: onboarding and account settings now edit a Luma username, hackathon admin configuration can require it, public and participant helpers understand the new requirement, and admin application review surfaces expose the stored username alongside the other profile signals. The participant-profile BDD fixture was switched to a Luma requirement so the actor-facing requirement gate is explicitly covered.

Validation: `bun run typecheck`, `bun run lint`, `bun run test:unit`, and `bun run test:integration` all passed. Added a new migration file `drizzle/0004_luma_profile_requirements.sql` for the schema change. No additional follow-up task was created; if desired, the next step would be running the full Auth0-backed BDD suite to verify the updated fixture and account forms end to end.
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
