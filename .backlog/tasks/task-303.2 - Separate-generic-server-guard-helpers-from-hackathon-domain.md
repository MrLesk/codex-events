---
id: TASK-303.2
title: Separate generic server guard helpers from hackathon domain
status: Done
assignee:
  - Codex
created_date: '2026-04-29 17:34'
updated_date: '2026-04-29 17:35'
labels:
  - architecture
  - server
  - refactor
dependencies: []
documentation:
  - docs/README.md
  - docs/domain-model.md
modified_files:
  - server/domains/lifecycle-guard.ts
  - server/domains/hackathons/lifecycle-guard.ts
  - server/domains/hackathons/index.ts
  - server/domains/applications/index.ts
parent_task_id: TASK-303
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Prevent the new hackathons domain module from becoming a generic dependency bucket. Move cross-domain guard helpers out of server/domains/hackathons so application, team, judging, account, and route code do not import generic assertion helpers through the hackathons domain.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Generic server assertion/state guard helpers are no longer located under server/domains/hackathons.
- [x] #2 Callers import those generic helpers from a neutral server boundary rather than through the hackathons domain.
- [x] #3 No compatibility aliases or duplicate guard implementations remain for the old hackathons guard path.
- [x] #4 The refactor preserves behavior and passes required validation: lint, typecheck, and unit tests.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Move server/domains/hackathons/lifecycle-guard.ts to a neutral server/domain guard module rather than a hackathon-owned path.
2. Update all imports from #server/domains/hackathons/lifecycle-guard to the neutral path, with no old-path re-export.
3. Confirm no hackathon guard path imports remain.
4. Run bun run lint, bun run typecheck, and bun run test:unit before finalizing.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Moved cross-domain assertAllowedState/assertGuard helpers from the hackathons domain to server/domains/lifecycle-guard. Updated all callers to the neutral path and left no old hackathons/lifecycle-guard re-export.

Validation passed: bun run lint; bun run typecheck; bun run test:unit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Moved the generic server lifecycle/assertion guards out of server/domains/hackathons into server/domains/lifecycle-guard so other domains no longer depend on hackathons for cross-domain assertion helpers. Updated all imports directly to the neutral path and removed the old hackathons guard file without a compatibility alias.

Validation passed: bun run lint; bun run typecheck; bun run test:unit. Docs/config were confirmed unchanged because this is a behavior-preserving import-boundary correction.
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
