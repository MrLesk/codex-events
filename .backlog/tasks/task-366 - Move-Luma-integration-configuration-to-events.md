---
id: TASK-366
title: Move Luma integration configuration to events
status: Done
assignee:
  - Codex
created_date: '2026-06-04 10:44'
updated_date: '2026-06-04 13:12'
labels:
  - luma
  - events
  - integration
dependencies: []
documentation:
  - docs/domain-model.md
  - docs/api-surface.md
  - docs/tech-stack.md
  - docs/testing-strategy.md
  - OPERATOR.md
  - DEVELOPMENT.md
modified_files:
  - .env.example
  - .github/workflows/deploy-production.yml
  - .github/workflows/deploy-test.yml
  - DEVELOPMENT.md
  - OPERATOR.md
  - README.md
  - app/components/account/AccountPlatformDebugPanel.vue
  - app/components/account/events/AccountEventAdminSettingsPanel.vue
  - app/components/admin/AdminEventCreateEditForm.vue
  - app/components/admin/EventConfigForm.vue
  - app/domains/applications/admin-application-record.ts
  - app/domains/events/admin-event.ts
  - app/domains/events/records.ts
  - app/pages/account/platform-settings.vue
  - app/pages/admin/events/new.vue
  - docs/api-surface.md
  - docs/domain-model.md
  - docs/schema-outline.md
  - drizzle/0056_event_luma_configuration.sql
  - nuxt.config.ts
  - 'server/api/admin/events/[eventId]/actions/backfill-luma-emails.post.ts'
  - 'server/api/events/[eventId]/applications/index.post.ts'
  - 'server/api/events/[eventId]/index.get.ts'
  - 'server/api/events/[eventId]/index.patch.ts'
  - 'server/api/events/[eventId]/luma/actions/retry-configuration.post.ts'
  - server/api/events/index.post.ts
  - server/api/platform-settings/debug.get.ts
  - 'server/api/public/events/[slug]/luma/webhooks.post.ts'
  - server/api/public/luma/webhooks.post.ts
  - server/database/schema.ts
  - server/domains/applications/index.ts
  - server/domains/applications/luma-sync-queue.ts
  - server/domains/applications/luma-webhooks.ts
  - server/domains/applications/review-finalization.ts
  - server/domains/events/index.ts
  - server/domains/events/luma-webhook-registration.ts
  - shared/domains/luma/webhook-url.ts
  - tests/integration/server/api/admin-luma-backfill-routes.test.ts
  - tests/integration/server/api/application-routes.test.ts
  - tests/integration/server/api/platform-settings-debug-routes.test.ts
  - tests/integration/server/api/public-luma-webhook-routes.test.ts
  - tests/integration/server/database/migration.test.ts
  - tests/support/backend/api-route.ts
  - tests/unit/app/domains/admin-domain-modules.test.ts
  - tests/unit/app/domains/events/admin-event-schema.test.ts
  - tests/unit/server/database/schema.test.ts
  - tests/unit/server/domains/applications/index.test.ts
  - tests/unit/server/domains/applications/luma-sync-queue.test.ts
  - tests/unit/server/domains/applications/luma-webhooks.test.ts
  - tests/unit/server/domains/events/luma-webhook-registration.test.ts
  - tests/unit/tools/deploy/write-worker-secrets.test.ts
  - tests/unit/tools/luma/webhook-bootstrap.test.ts
  - tools/deploy/write-worker-secrets.ts
  - tools/luma/webhook-bootstrap.ts
priority: high
ordinal: 63000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Move Luma credentials and webhook setup from platform-level runtime configuration into event-level configuration so each event can use its own Luma API key and copy its own webhook target details into Luma. Remove platform/debug-page Luma configuration surfaces while preserving event-scoped guest verification, status sync, and attendance webhook behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Event admins and platform admins can store an event-specific Luma API key in event settings using a masked input consistent with the existing credits secret input pattern.
- [x] #2 Event settings display the event's Luma webhook details beside the API key field so operators can copy the values into Luma for that event.
- [x] #3 Runtime Luma guest verification, approval/rejection sync, and attendance webhook handling use event-scoped Luma configuration instead of platform-level Luma API key/webhook configuration.
- [x] #4 Platform-level Luma API key/webhook configuration is removed from operator-facing platform setup and debug surfaces.
- [x] #5 Canonical documentation and operator/contributor guidance describe event-scoped Luma configuration without platform-level Luma API key instructions.
- [x] #6 Relevant unit, integration, and browser/workflow tests are updated or added for the event-scoped Luma behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approved event-admin flow after user feedback: Event admins configure Luma from event settings by entering the Luma event URL (optional public link), Luma event API ID, and event-specific Luma API key. On save, Codex uses the saved API key to create or update the event's Luma `guest.updated` webhook, stores Luma's returned webhook ID and `whsec_...` signing secret on the event, and verifies future webhook requests with Luma's `Webhook-Signature` HMAC flow. If webhook registration fails, event settings must show a warning that the webhook was not registered correctly and prompt the admin to verify the API key and its permissions for the configured Luma event API ID. When Luma fields change or registration fails, admins can use a `Retry Luma configuration` action to run webhook reconciliation again. Do not use an app-generated secret in the URL.

Implementation plan:
1. Data model: add event-level Luma credential/webhook fields to `events`: `luma_api_key`, `luma_webhook_id`, `luma_webhook_secret`, `luma_webhook_status`, `luma_webhook_error`, and `luma_webhook_registered_at`; keep existing `luma_event_url` and `luma_event_api_id` event-owned.
2. Event API/contracts: accept `lumaApiKey` through create/update event config, persist it as an event secret, and serialize Luma webhook setup status/details only through admin-visible event configuration responses. Keep public/participant event surfaces free of credentials and webhook secrets.
3. Automatic webhook reconciliation on save: when an event has both a Luma API key and Luma event API ID, create or update a Luma `guest.updated` webhook for that event's Codex webhook URL, store the returned Luma webhook ID and signing secret, and set webhook status to configured. If the request fails, store a failed status and safe error reason without blocking the rest of the event settings save.
4. Retry action: add an authenticated event-admin endpoint to retry Luma configuration for an event. It reruns webhook reconciliation using the stored event Luma API key and event API ID, updates status/error fields, and returns the updated event configuration.
5. Runtime Luma calls: update application submission validation, queue processing, withdrawal sync, legacy Luma email backfill, and attendance guest lookup to use the event's stored Luma API key instead of `NUXT_LUMA_API_KEY`.
6. Event webhook route: move inbound attendance webhooks to an event-scoped public route such as `/api/public/events/:eventId/luma/webhooks`, load that event's stored Luma webhook secret, verify `Webhook-Signature` using the documented HMAC-SHA256 flow, cross-check the payload's Luma event API ID with the configured event, then process the same `guest.updated` check-in behavior.
7. Luma enablement rule: Luma guest validation/status sync/attendance sync are enabled only when the event has visible+required Luma email, a Luma event API ID, a Luma API key, and a successfully configured stored webhook secret for inbound attendance.
8. Event settings UI: add a masked Luma API key input beside the Luma event API ID/public URL fields. Show copyable webhook URL and setup state next to the field. If setup failed, show a warning telling the admin to verify the API key and permissions for the Luma event API ID, plus a `Retry Luma configuration` button.
9. Remove platform/debug Luma surfaces: remove `NUXT_LUMA_API_KEY` and `NUXT_LUMA_WEBHOOK_SECRET` from deploy secrets and workflows, remove the platform debug Luma payload/UI, and remove or repurpose the deploy-time Luma webhook bootstrap script/tests because webhook setup becomes event-owned.
10. Docs/tests: update canonical docs, README/operator/development/env examples, schema tests, event config tests, Luma queue/webhook unit tests, and integration tests covering event admin config save, failed webhook registration warnings, retry action, application submission, queue sync, and public event webhook handling.
11. Validation: run `bun run lint`, `bun run typecheck`, `bun run test:unit`, `bun run test:integration`, and `bun run test:bdd` unless blocked.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented event-scoped Luma configuration. Event admins can store a masked Luma API key with the event, event create/update saves reconcile the event's Luma webhook and persist the returned webhook ID/signing secret/status/error, and admins can retry configuration from event settings. Runtime Luma verification, approval/rejection sync, backfill, and attendance webhook handling now use event-owned Luma configuration and event-owned webhook signature secrets. Platform-level Luma runtime secrets, debug UI, global webhook route, and deploy-time webhook bootstrap were removed.

After review against the credits reveal control, the Luma API key mask toggle was switched from a hand-styled button inside the label to the same `AppButton` eye/eye-off pattern used by credits, with `for`/`id` label binding on the input. Verified password/text/password toggle behavior in Playwright.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Moved Luma from platform-level runtime configuration to event-level configuration. Added event database fields/migration for the event API key and webhook registration state, automatic webhook reconciliation on event save, event-admin retry action, and event-scoped public Luma webhook verification using the stored signing secret. Updated event settings UI with a masked Luma API key input, copyable webhook URL/status display, failed-registration warning, and retry control. Removed global platform Luma secrets/debug/bootstrap surfaces and updated docs, deploy workflows, and tests. Validation passed: bun run lint, bun run typecheck, bun run test:unit, bun run test:integration, bun run test:bdd. Local UI spot check passed on desktop and mobile for the event settings Luma section; existing markdown editor hydration warnings remain unrelated.

Adjusted the Luma API key reveal control to match the existing credits reveal pattern: `AppButton` with eye/eye-off icon, sr-only text, aria pressed state, and a separate explicit label/input association.
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
