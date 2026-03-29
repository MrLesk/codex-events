---
id: TASK-104
title: Fix Cloudflare deploy failure from proof-link helper import
status: Done
assignee:
  - codex
created_date: '2026-03-29 19:27'
updated_date: '2026-03-29 19:29'
labels:
  - bug
  - build
  - deploy
dependencies: []
references:
  - >-
    https://github.com/MrLesk/codex-hackathons/actions/runs/23716932809/job/69085693291
documentation:
  - /Users/alex/projects/codex-hackathons/app/utils/participant-application.ts
  - /Users/alex/projects/codex-hackathons/server/utils/applications.ts
  - /Users/alex/projects/codex-hackathons/shared/proof-of-execution-links.ts
  - /Users/alex/projects/codex-hackathons/nuxt.config.ts
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Restore the shared dev deploy by removing the build-time resolution failure introduced after TASK-101. The current Cloudflare/Nitro build fails on main because the proof-of-execution helper is imported from app/server code through a raw relative path into `shared/`, which survives into generated `.nuxt/dist/server` chunks and breaks the Cloudflare bundle. Preserve the current comma-separated proof-link behavior while making the helper available through a bundle-safe import pattern.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `bun run build:cloudflare` succeeds on the current main branch after the fix.
- [x] #2 Participant proof-of-execution parsing and validation behavior remains unchanged for the registration and admin review flows.
- [x] #3 Relevant local validation passes for the fix, including `bun run test:unit`.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a bundle-safe alias for the proof-of-execution helper, following the existing `#platform-legal` alias pattern in `nuxt.config.ts`.
2. Update `app/utils/participant-application.ts` and `server/utils/applications.ts` to import the helper through that alias so generated Nuxt server chunks do not retain raw relative paths into `shared/`.
3. Run `bun run build:cloudflare` and `bun run test:unit` to verify the deploy regression is fixed and the proof-link behavior remains intact.
4. If validation passes, document that canonical docs remain unchanged because this is a packaging fix with no product behavior change.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Discovered during validation that the initial Nuxt alias fix resolved `bun run build:cloudflare` but caused unit-test resolution failures because Vitest maintains its own alias map. Updated both `vitest.config.ts` and `vitest.integration.config.ts` to keep shared-file alias resolution aligned with `nuxt.config.ts`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed the Cloudflare deploy regression introduced after TASK-101 by routing the shared proof-of-execution helper through a bundle-safe alias instead of raw relative imports from app/server code into `shared/`. Added `#proof-of-execution-links` to `nuxt.config.ts` and updated the participant and server application utilities to import through that alias, which prevents Nitro’s generated server chunks from retaining unresolved filesystem-relative imports during the Cloudflare build. To keep local validation aligned with runtime behavior, added the same alias to both Vitest configs because the initial build fix exposed a test-only module-resolution gap. Product behavior and storage semantics remain unchanged: proof-of-execution links are still parsed and validated exactly as before. Canonical docs remain unchanged because this is a packaging/configuration fix, not a product-rule change.

Validation passed with `bun run test:unit` and `bun run build:cloudflare`.

Risk/follow-up: any future shared-file alias added to `nuxt.config.ts` should also be mirrored in the Vitest configs unless test resolution is centralized.
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
