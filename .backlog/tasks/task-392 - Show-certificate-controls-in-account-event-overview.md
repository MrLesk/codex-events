---
id: TASK-392
title: Show certificate controls in account event overview
status: Done
assignee:
  - Codex
created_date: '2026-06-13 19:19'
updated_date: '2026-06-13 19:34'
labels:
  - ui
  - events
  - certificates
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
  - docs/permissions-matrix.md
  - docs/api-surface.md
  - docs/schema-outline.md
  - docs/testing-strategy.md
priority: medium
ordinal: 71000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Checked-in participants can access their certificate from their account event overview after an event is complete and decide whether certificate generation remains enabled. Certificates are generated and shown publicly by default. If the participant disables certificate generation, the public certificate reads are unavailable and participant account surfaces stop showing the certificate link until they enable generation again.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A checked-in participant viewing a completed event in their account overview sees a link to their certificate when certificate generation is enabled.
- [x] #2 The same account event overview lets the participant toggle certificate generation, with generation enabled by default.
- [x] #3 Disabled certificate generation suppresses the certificate link in participant account surfaces and makes public certificate reads unavailable.
- [x] #4 Existing user-facing certificate displays are checked and updated when they expose the same participant generation state.
- [x] #5 Relevant tests cover the account overview generation toggle contract and public unavailability behavior.
- [x] #6 The account My events list shows a View certificate action near Open overview for completed events where the signed-in participant is checked in, certificate-eligible, and certificate generation is enabled.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Treat `certificateHiddenAt` as participant-disabled certificate generation: public certificate reads remain 404 while disabled, and participant account surfaces do not show a View certificate link while disabled.
2. Keep the account event overview certificate controls limited to completed events where the signed-in participant is approved and effectively checked in; replace the current hide/public button copy with a switch-style control labeled around enabling/disabling certificate generation.
3. Add a My events card `View certificate` action near the existing `Open overview` action only for completed, approved, checked-in participants whose certificate generation is enabled.
4. Check and update adjacent certificate surfaces that expose the same information, especially the admin Certificates tab copy/status and canonical docs/API text if they still frame this as public-only visibility.
5. Add/update focused unit and integration tests, then run required validation: lint, typecheck, unit tests, plus targeted integration tests for certificate/account participation behavior.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
User clarified disabled certificate generation should hide the certificate from everybody, including the participant, and requested clearer switch labeling around disabling certificate generation.

Implemented certificate-generation wording and behavior: disabled generation now hides certificate links from participant account surfaces while existing public certificate reads continue to return not found. Added the My events card certificate action through the event participation domain helper so it only appears for completed, approved, checked-in participation with generation enabled. Validation passed: bun run lint, bun run typecheck, bun run test:unit, bun run test:integration, bun run test:bdd.
<!-- SECTION:NOTES:END -->

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

## Comments

<!-- COMMENTS:BEGIN -->
author: Codex
created: 2026-06-13 19:20
---
User clarified that the certificate link should also appear in the account My events list under or near the existing Open overview action shown on each event card.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Summary:
- Added a self-scoped certificate action for My events participation cards; it links to the participant certificate only for completed, approved, checked-in participation with certificate generation enabled.
- Updated the account event overview certificate panel to use a switch labeled `Disable certificate generation`; disabling removes the participant-facing certificate link and preserves public 404 behavior.
- Updated admin certificate copy and canonical docs to describe disable/enable certificate generation rather than public-only hiding.
- Extended participation payload/tests with the caller application user id and certificate action coverage.

Validation:
- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`
- `bun run test:integration`
- `bun run test:bdd`

Risks and follow-ups:
- No known follow-up required.
<!-- SECTION:FINAL_SUMMARY:END -->
