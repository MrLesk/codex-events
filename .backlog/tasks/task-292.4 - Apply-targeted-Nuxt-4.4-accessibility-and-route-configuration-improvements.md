---
id: TASK-292.4
title: Apply targeted Nuxt 4.4 accessibility and route-configuration improvements
status: Done
assignee:
  - Codex
created_date: '2026-04-25 22:20'
updated_date: '2026-04-25 22:25'
labels:
  - nuxt
  - accessibility
dependencies: []
references:
  - 'https://nuxt.com/blog/v4-3'
  - 'https://nuxt.com/blog/v4-4'
documentation:
  - docs/tech-stack.md
parent_task_id: TASK-292
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Adopt current Nuxt features where they improve production behavior without changing product rules. Focus on centralized layout route rules and dynamic screen-reader announcements for high-value in-page state changes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Nuxt route layout configuration is centralized with appLayout routeRules for route groups where this removes repeated per-page layout declarations without changing middleware behavior.
- [x] #2 NuxtAnnouncer is mounted in the app shell, and at least one high-value dynamic workflow uses useAnnouncer for an in-page success or failure announcement.
- [x] #3 Any caching or payload-extraction change is applied only when it is safe for current public data freshness expectations, or documented as intentionally deferred.
- [x] #4 Validation passes: bun run lint, bun run typecheck, and bun run test:unit.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Implementation plan:
1. Add Nuxt routeRules with appLayout for route families that already consistently use the profile layout: /account/**, /admin/**, and /prize-redemptions/**.
2. Remove the now-redundant layout declarations from matching page-level definePageMeta blocks while preserving middleware declarations.
3. Mount NuxtAnnouncer in app/app.vue alongside NuxtRouteAnnouncer.
4. Add useAnnouncer to the imprint contact form for dynamic success/failure announcements without changing form behavior.
5. Defer caching/payload extraction unless the current code provides a safe freshness boundary; record that decision in task notes.
6. Run lint, typecheck, and unit tests, then finalize and commit TASK-292.4 separately.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Worker started discovery for TASK-292.4. Current findings: `NuxtRouteAnnouncer` is already mounted in `app/app.vue`; Nuxt 4.4 local types support `routeRules.appLayout`; account/admin pages in owned scope repeat `layout: 'profile'` alongside middleware; no current `NuxtAnnouncer` or `useAnnouncer` usage found. Assessing payload extraction/caching conservatively before any config change.

Coordinator completed the implementation locally after the worker returned no actionable changes. Added profile appLayout routeRules for /account, /account/**, /admin/**, /prize-redemptions, and /prize-redemptions/**; removed redundant profile layout declarations from matching pages while preserving middleware. Mounted NuxtAnnouncer in app.vue and added polite/assertive contact-form announcements to the imprint workflow. Deferred caching/payload extraction because public hackathon freshness expectations are not explicitly documented enough to choose a safe SWR window in this task. Validation passed: bun run lint, bun run typecheck, bun run test:unit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Centralized repeated profile layout declarations with Nuxt routeRules/appLayout, mounted NuxtAnnouncer, and announced imprint contact success/failure states with useAnnouncer. Caching and payload extraction were intentionally deferred pending explicit public data freshness rules. Validation passed with lint, typecheck, and unit tests.
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
