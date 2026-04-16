---
id: TASK-224
title: Make submission required fields configurable per hackathon
status: Done
assignee:
  - codex
created_date: '2026-04-16 06:06'
updated_date: '2026-04-16 06:17'
labels:
  - submission
  - admin-config
  - validation
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Allow hackathon admins to configure whether project submission summary, repository URL, and demo URL are required. Mirror the existing registration-required-fields pattern so admin settings, participant submission validation, and server enforcement stay consistent.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Hackathon configuration exposes admin-controlled required flags for submission summary, repository URL, and demo URL.
- [x] #2 Participant submission draft/save/submit validation treats those fields as optional unless the corresponding hackathon flag is enabled, and when enabled shows the same submit-attempt client-side required-field feedback pattern used by registration.
- [x] #3 Server-side submission validation mirrors the configured required flags for create, update, and submit flows so required fields cannot be bypassed.
- [x] #4 Relevant docs and automated tests are updated to reflect the canonical submission-required-field configuration behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend hackathon configuration with required-submission-field flags for summary, repository URL, and demo URL, and thread them through admin form state, hackathon create/patch payloads, serializers, and canonical docs.
2. Update participant submission client validation to derive required-field rules from hackathon configuration while preserving the existing submit-attempt error display pattern and current track-selection behavior.
3. Mirror the same required-field enforcement on the server for submission create, update, and submit flows; add/update automated tests; then run bun run lint, bun run typecheck, and bun run test:unit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Discovery: submission columns are already nullable in the schema; the behavior change is driven by new hackathon-level required flags plus mirrored client/server validation.

Validation complete: lint, typecheck, unit suite, and targeted integration coverage for hackathon config + submission routes all passed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added hackathon-level submission requirement flags for summary, repository URL, and demo URL, exposed them in the admin hackathon settings/create form, and serialized them through the shared hackathon API contract. Updated the participant submission form to derive required-field client validation from hackathon config while preserving the existing submit-attempt error pattern, and mirrored the same rules on the server for create, update, and submit flows. Optional submission fields now normalize to null when cleared. Updated canonical docs plus unit/integration coverage. Validation passed: `bun run lint`, `bun run typecheck`, `bun run test:unit`, and targeted integration tests via `bunx vitest --config vitest.integration.config.ts run tests/integration/server/api/submission-routes.test.ts tests/integration/server/api/hackathon-routes.test.ts`. Risks/follow-up: submission content columns were already nullable, so no migration was needed there; the only database migration added is the new hackathon config flags.
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
