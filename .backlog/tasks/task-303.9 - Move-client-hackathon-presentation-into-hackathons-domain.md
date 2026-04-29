---
id: TASK-303.9
title: Move client hackathon presentation into hackathons domain
status: Done
assignee:
  - Codex
created_date: '2026-04-29 17:46'
updated_date: '2026-04-29 17:48'
labels:
  - architecture
  - client
  - refactor
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
  - docs/api-surface.md
modified_files:
  - app/domains/hackathons/presentation.ts
  - app/composables/useHackathonPresentation.ts
  - tests/unit/app/domains/hackathons/presentation.test.ts
  - tests/unit/app/composables/useHackathonPresentation.test.ts
parent_task_id: TASK-303
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Move public hackathon presentation types, labels, and formatting helpers out of app/composables into a client hackathons domain module. Preserve UI behavior while making the client domain boundary clearer.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Public hackathon presentation types and formatting helpers live under app/domains/hackathons rather than app/composables.
- [x] #2 Pages, components, composables, and client domain modules import hackathon presentation code from the hackathons domain directly, with no compatibility alias for the old composable path.
- [x] #3 Tests covering hackathon presentation behavior are moved or updated to match the new domain layout.
- [x] #4 The refactor preserves behavior and passes required validation: lint, typecheck, and unit tests.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Move app/composables/useHackathonPresentation.ts to app/domains/hackathons/presentation.ts.
2. Update all app and test imports from ~/composables/useHackathonPresentation or relative composable paths to ~/domains/hackathons/presentation.
3. Move the unit test to tests/unit/app/domains/hackathons/presentation.test.ts and update relative imports.
4. Run the targeted presentation unit test, then bun run lint, bun run typecheck, and bun run test:unit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Moved hackathon presentation types/formatters from app/composables/useHackathonPresentation.ts to app/domains/hackathons/presentation.ts. Because Nuxt only auto-imported the old composable path, Vue files now import the presentation helpers explicitly from the domain module; no old composable path remains.

Validation passed: bunx vitest run tests/unit/app/domains/hackathons/presentation.test.ts; bun run lint; bun run typecheck; bun run test:unit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Moved public hackathon presentation types, labels, and formatting helpers into app/domains/hackathons/presentation.ts and removed the old app/composables/useHackathonPresentation.ts path. Updated pages, components, composables, client domain modules, and tests to import the hackathons domain module directly; explicit imports replaced Nuxt auto-import reliance for those helpers.

Validation passed: bunx vitest run tests/unit/app/domains/hackathons/presentation.test.ts; bun run lint; bun run typecheck; bun run test:unit. Docs/config were confirmed unchanged because this is behavior-preserving client module-boundary work.
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
