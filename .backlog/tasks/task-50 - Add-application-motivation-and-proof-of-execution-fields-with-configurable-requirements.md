---
id: TASK-50
title: >-
  Add application motivation and proof-of-execution fields with configurable
  requirements
status: Done
assignee:
  - '@codex'
created_date: '2026-03-27 21:31'
updated_date: '2026-03-27 21:57'
labels: []
dependencies: []
references:
  - docs/domain-model.md
  - docs/api-surface.md
  - docs/schema-outline.md
  - docs/permissions-matrix.md
  - docs/lifecycle-and-state-machines.md
  - docs/testing-strategy.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extend hackathon application data to capture two additional applicant signals: a short motivation statement ("why this hackathon") and proof-of-execution links. Allow hackathon admins to configure whether each of these two fields is required for applications in that hackathon. Keep all existing requirement fields and requirement behavior unchanged.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Canonical docs define the new application fields for why-this-hackathon text and proof-of-execution evidence
- [x] #2 Canonical docs define two hackathon configuration booleans that control whether each new field is required
- [x] #3 Hackathon create/update/read flows persist and return the two new requirement booleans
- [x] #4 Application submission accepts and persists the two new fields
- [x] #5 Application submission enforces each new requirement only when the corresponding hackathon setting is enabled
- [x] #6 Existing required profile/link fields keep their current required or optional behavior
- [x] #7 Participant registration UI exposes inputs for the two new fields and surfaces validation when required
- [x] #8 Relevant backend and frontend tests are added or updated for validation and form behavior
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1) Add two hackathon configuration booleans (`requireWhyThisHackathon`, `requireProofOfExecution`) across database schema, migration, backend validation schemas, serializers, create/update handlers, and admin/public/client-facing types.
2) Extend application submission payload with `whyThisHackathon` and `proofOfExecutionUrl`, persist both inside `registration_details_json`, and enforce requiredness only when the corresponding hackathon booleans are enabled.
3) Update participant registration UI and form validation to collect the two new fields and show required validation behavior controlled by hackathon settings.
4) Update canonical docs (`docs/domain-model.md`, `docs/api-surface.md`, `docs/schema-outline.md`) to reflect the new fields and required-setting behavior.
5) Update and add unit/integration tests covering new toggles, submission validation behavior, and serialization output.
6) Run `bun run test:unit` and report results.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented two new hackathon-configurable application requirements: `requireWhyThisHackathon` and `requireProofOfExecution` across schema, API config payloads, admin form controls, and participant form behavior.

Extended application submission payload and persisted registration details with `whyThisHackathon` and `proofOfExecutionUrl`, while preserving existing profile-field and in-person commitment behavior.

Added backend enforcement for required motivation/proof when configured and URL-scheme validation for proof links (`http`/`https`).

Updated canonical docs in `docs/domain-model.md`, `docs/api-surface.md`, and `docs/schema-outline.md` to include the new fields and requirement semantics.

Validation run: `bun run test:unit` passed; targeted integration suites for `application-routes` and `hackathon-routes` passed; `bun run typecheck` passed; `bun run lint` passed with pre-existing `vue/no-v-html` warnings only.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented configurable application-signal requirements for motivation and proof of execution without changing existing profile-field requirement semantics.

Delivered behavior:
- Added hackathon requirement toggles `requireWhyThisHackathon` and `requireProofOfExecution` to canonical schema/serialization, admin create+update payloads, and admin configuration UI controls.
- Extended application submission body and persisted registration details with `whyThisHackathon` and `proofOfExecutionUrl`.
- Enforced requiredness only when the corresponding hackathon toggle is enabled.
- Validated proof-of-execution URLs as `http`/`https` when provided.
- Extended participant registration form UI and validation to collect and conditionally require the two fields.
- Updated canonical docs (`domain-model`, `api-surface`, `schema-outline`) with the new fields and requirement rules.
- Added/updated backend and frontend tests, including integration coverage for required enforcement and invalid proof URL handling.

Validation:
- `bun run test:unit` passed.
- Targeted integration suites passed: `application-routes` and `hackathon-routes`.
- `bun run typecheck` passed.
- `bun run lint` passed with pre-existing `vue/no-v-html` warnings only.

Risk/follow-up:
- Current proof-of-execution capture is a single URL field (`proofOfExecutionUrl`). If multiple links are needed later, this can be expanded to an array shape in a follow-up schema update.
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
