---
id: TASK-403
title: Add public full track sharing mode
status: Done
assignee:
  - '@Codex'
created_date: '2026-06-14 17:24'
updated_date: '2026-06-14 17:32'
labels: []
dependencies: []
modified_files:
  - server/domains/events/index.ts
  - 'server/api/public/events/[slug]/index.get.ts'
  - app/domains/events/presentation.ts
  - 'app/pages/events/[slug]/index.vue'
  - app/components/public/events/EventTracksPanel.vue
  - docs/api-surface.md
  - docs/domain-model.md
  - docs/permissions-matrix.md
  - docs/schema-outline.md
  - tests/unit/server/domains/events/index.test.ts
  - tests/integration/server/api/event-routes.test.ts
ordinal: 82000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Allow public event detail links to opt into participant-facing full track details with full descriptions and resource links, while keeping staff instructions and other restricted event metadata private.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Public event detail API supports a tracks=full query value that includes full track descriptions and resource links for configured Hackathon and Build tracks.
- [x] #2 The public event page renders full track descriptions and resources when opened with tracks=full.
- [x] #3 Public full track responses never include staff instructions, track IDs, street address, Discord links, or other account-only metadata.
- [x] #4 Canonical docs and automated tests cover the public-safe full track sharing mode.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a validated public event detail query schema for tracks=full and keep the default public response unchanged.
2. Extend public track serialization with a participant-facing full mode that includes fullDescription and resources but never IDs or staffInstructions.
3. Forward tracks=full from the public event detail page API fetch and render full descriptions/resources in the existing public tracks panel when present.
4. Update canonical visibility/API docs and extend existing unit/integration tests.
5. Run lint, typecheck, unit tests, targeted integration tests, then finalize TASK-403.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented public-safe full track sharing with tracks=full on GET /api/public/events/:slug. The full mode includes participant-facing fullDescription and resource links, while default public responses stay short-only and full public responses omit track IDs, resource IDs, staffInstructions, address, and discordServerUrl. Updated the public event detail page to request full track details only when the page query includes tracks=full and expanded the existing public tracks panel to render guidelines and resources when present.

Validation passed: bun run test:unit -- tests/unit/server/domains/events/index.test.ts; bun run test:integration -- tests/integration/server/api/event-routes.test.ts; bun run lint; bun run typecheck; bun run test:unit; bun run test:integration; bun run test:bdd; git diff --check.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added the public-safe tracks=full sharing mode for public event detail links. Public event APIs now include full participant-facing track descriptions and resource links only when explicitly requested, without exposing staff notes or internal IDs, and the public details page renders those fields from the existing tracks panel. Updated canonical visibility docs and automated coverage; all required validation passed.
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
