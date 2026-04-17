---
id: TASK-236
title: Normalize hackathon lifecycle status chips across public and account surfaces
status: Done
assignee:
  - codex
created_date: '2026-04-17 11:15'
updated_date: '2026-04-17 11:52'
labels: []
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/lifecycle-and-state-machines.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Use the hackathon public detail header styling and lifecycle-label behavior as the canonical presentation for hackathon status chips across participant, account, admin, and judge surfaces. Remove the current drift where different pages render different colors, typography, and special-case labels for the same hackathon state.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Hackathon lifecycle chips use one canonical state-presentation mapping across the public detail header, account hackathon detail header, participant hackathon cards, and admin or judge dashboard hackathon lists.
- [x] #2 Colors and typography match the public hackathon detail page treatment for equivalent lifecycle states, including the current purple treatment for the active competition stages the detail page already uses.
- [x] #3 Special-case labels such as upcoming registration and registration closed are rendered consistently anywhere the canonical lifecycle chip is shown.
- [x] #4 Relevant unit tests are updated to cover the shared lifecycle-chip presentation behavior and prevent the current cross-surface drift from returning.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Move the public detail header lifecycle-chip label and class logic into one shared presenter so label text, color mapping, and special registration-window labels come from a single source.
2. Update the public detail header, account hackathon detail header, participant hackathon cards, public hackathon cards, and admin or judge dashboard hackathon lists to render the shared lifecycle chip instead of maintaining local styling logic.
3. Remove the duplicate dashboard-specific lifecycle-chip presentation helper from the admin workspace utilities and adjust unit tests to assert the canonical lifecycle-chip presentation behavior.
4. Run bun run lint, bun run typecheck, and bun run test:unit, then capture results and any remaining risks in the task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Normalized hackathon lifecycle chips by making HackathonStateBadge use the public detail header class mapping and registration-window label logic as the shared presentation path.

Replaced local lifecycle chip implementations on public detail, registration, application-terms, account detail, and admin or judge dashboard list surfaces so they all render the same lifecycle chip treatment.

Extended dashboard list items with registration window timestamps so Upcoming and Registration closed labels can render consistently outside the public detail page.

Validation passed locally: bun run lint, bun run typecheck, bun run test:unit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Normalized hackathon lifecycle status chips to the public detail page treatment across public and account surfaces. HackathonStateBadge now renders the canonical public-detail class mapping and registration-window label behavior, and the public detail, registration, application-terms, account detail, and admin or judge dashboard list surfaces all use that shared chip instead of separate local mappings.

The admin workspace no longer carries a separate dashboard-only lifecycle badge presenter. Dashboard list items now include registration window timestamps so Upcoming and Registration closed labels can be derived consistently wherever the shared lifecycle chip is shown.

Tests: `bun run lint`, `bun run typecheck`, and `bun run test:unit` all passed locally.

Docs were confirmed unchanged because the canonical hackathon lifecycle states and meanings already match the implemented behavior. Residual risk is limited to visual contrast on image-overlay chips, but the existing public card override remains in place.
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
