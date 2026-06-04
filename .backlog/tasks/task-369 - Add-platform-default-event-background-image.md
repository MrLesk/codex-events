---
id: TASK-369
title: Add platform default event background image
status: Done
assignee:
  - '@Codex'
created_date: '2026-06-04 16:13'
updated_date: '2026-06-04 18:32'
labels:
  - platform-admin
  - events
  - frontend
  - backend
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/schema-outline.md
  - docs/api-surface.md
  - docs/permissions-matrix.md
  - docs/tech-stack.md
  - docs/testing-strategy.md
modified_files:
  - server/database/schema.ts
  - drizzle/0057_platform_settings.sql
  - server/domains/platform/settings.ts
  - server/domains/events/images.ts
  - server/domains/events/index.ts
  - server/api/platform-settings/current.get.ts
  - server/api/platform-settings/event-default-background-image.post.ts
  - server/api/platform-settings/event-default-background-image.delete.ts
  - server/api/public/platform/event-default-background-image.get.ts
  - server/api/account/events.get.ts
  - server/api/events/index.get.ts
  - server/api/events/index.post.ts
  - server/api/events/[eventId]/index.get.ts
  - server/api/events/[eventId]/index.patch.ts
  - server/api/events/slug/[slug]/index.get.ts
  - server/api/events/[eventId]/images/background.post.ts
  - server/api/events/[eventId]/images/background.delete.ts
  - server/api/events/[eventId]/images/banner.post.ts
  - server/api/events/[eventId]/images/banner.delete.ts
  - server/api/public/events/index.get.ts
  - server/api/public/events/[slug]/index.get.ts
  - app/pages/account/platform-settings.vue
  - app/pages/account/events/[slug]/index.vue
  - app/components/account/AccountPlatformEventDefaultsPanel.vue
  - app/components/public/events/EventCard.vue
  - app/composables/usePlatformSettings.ts
  - app/composables/useUserEvents.ts
  - app/domains/events/records.ts
  - app/domains/events/presentation.ts
  - app/pages/events/[slug]/index.vue
  - app/pages/events/[slug]/register.vue
  - app/pages/events/[slug]/application-terms.vue
  - app/pages/events/[slug]/feedback.vue
  - tests/unit/server/database/schema.test.ts
  - tests/unit/server/domains/events/images.test.ts
  - tests/unit/server/domains/events/index.test.ts
  - tests/unit/server/domains/platform/settings.test.ts
  - tests/unit/app/domains/events/presentation.test.ts
  - tests/unit/app/composables/usePlatformSettings.test.ts
  - tests/integration/server/api/actor-platform-routes.test.ts
  - tests/integration/server/api/event-routes.test.ts
  - docs/domain-model.md
  - docs/schema-outline.md
  - docs/api-surface.md
  - docs/permissions-matrix.md
  - docs/tech-stack.md
priority: medium
ordinal: 66000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a platform-admin-managed default background image for events that do not have their own event-specific background image. The default is a managed JPG/PNG upload stored in the existing EVENT_IMAGES R2 bucket, is visible on event detail backgrounds across event types, and does not overwrite stored event background_image_url values. Event-specific backgrounds override the platform default; event cards continue to prefer event banners before the effective background.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Platform admins can upload, preview, replace, and remove a default event background image from Platform settings.
- [x] #2 The platform default is stored as deployment-wide platform settings and delivered from a public platform image endpoint using the existing EVENT_IMAGES R2 bucket.
- [x] #3 Event API payloads expose a separate displayBackgroundImageUrl while keeping backgroundImageUrl as the event-specific stored value.
- [x] #4 Events without an event-specific background use the platform default for detail page backgrounds, including events that have a banner image.
- [x] #5 Events with an event-specific background continue to use that background instead of the platform default.
- [x] #6 Public event cards continue to prefer banner images before the effective background image.
- [x] #7 Authorization, upload validation, rate limiting, audit logging, public image delivery, and missing-image behavior are covered by automated tests.
- [x] #8 Canonical docs describe the platform default background setting, APIs, permissions, storage, and event display behavior.
- [x] #9 Required validation passes before handoff.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
# Add Platform Default Event Background

## Summary
- Add a platform-admin-managed default event background image using managed JPG/PNG upload into the existing `EVENT_IMAGES` R2 bucket.
- Event-specific background images remain stored on each event and always override the platform default.
- When an event has no event-specific background, event detail backgrounds use the platform default, even if the event has a banner. Event cards still prefer the event banner, then the effective background.
- Keep stored fields separate from display fields so admin event settings do not mistake the platform default for an event-uploaded background.

## Implementation
1. Add a new `platform_settings` singleton table with `id = 'default'`, `default_event_background_image_url`, `created_at`, and `updated_at`; add the matching Drizzle schema export and migration.
2. Add platform settings domain helpers for get/upsert/serialize, default image object key/path helpers, and public display URL resolution.
3. Add platform settings APIs:
   - `GET /api/platform-settings/current`
   - `POST /api/platform-settings/event-default-background-image`
   - `DELETE /api/platform-settings/event-default-background-image`
   - `GET /api/public/platform/event-default-background-image`
4. Reuse existing event image validation, upload rate limiting, R2 binding resolution, MIME detection, `nosniff`, and audit patterns.
5. Add `displayBackgroundImageUrl` to public, caller-visible, admin, account event, and event participation payloads while keeping `backgroundImageUrl` as the event-specific stored value.
6. Add an `Event defaults` tab to `/account/platform-settings` with preview, replace, and remove controls for the default background.
7. Update event hero/image selection helpers so detail pages use `displayBackgroundImageUrl || bannerImageUrl`, while event cards use `bannerImageUrl || displayBackgroundImageUrl`.
8. Update canonical docs: `docs/domain-model.md`, `docs/schema-outline.md`, `docs/api-surface.md`, `docs/permissions-matrix.md`, and `docs/tech-stack.md`.

## Test Plan
- Unit tests for platform settings serialization/upsert behavior, platform default image object key/path helpers, schema table/checks, frontend composable, and image selection helper.
- Integration tests for platform-admin-only upload/delete, public image delivery, invalid/oversized uploads, rate limiting, audit rows, and missing-default behavior.
- Event API integration tests proving default display URL behavior and event-specific override behavior.
- Run `bun run lint`, `bun run typecheck`, `bun run test:unit`, `bun run test:integration`, and `bun run test:bdd` before handoff.
- Smoke-check the platform settings UI and representative event pages in the browser.

## Constraints
- Applies to all event types.
- Managed upload only; no external URL input.
- No backfill: existing event `background_image_url` values remain unchanged.
- Use the existing `EVENT_IMAGES` bucket; no new Cloudflare binding.
- Leave unrelated dirty worktree changes untouched.
- Commit directly on `main` and push `origin/main` after validation using `TASK-369 - Add platform default event background image`.
<!-- SECTION:PLAN:END -->

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

## Summary

- Added the `platform_settings` singleton table, domain helpers, platform settings APIs, public default-image delivery, and event payload display image resolution.
- Added the Platform settings Event defaults UI with managed upload, preview, replace, and remove controls.
- Updated event detail and card image selection helpers so detail pages use the effective display background first and cards prefer banners first.
- Updated canonical docs for domain behavior, schema, API surface, permissions, and R2 storage.

## Validation

- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`
- `bun run test:integration`
- `bun run test:bdd`
- Smoke-checked `/account/platform-settings?tab=event-defaults`, uploaded and previewed a default background, verified a representative event detail page and public event card used the effective default background, and removed the default again.

## Test Gaps And Risks

- No remaining automated test gaps for the requested behavior.
